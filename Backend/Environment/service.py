from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from utlis.db_utlis import executeQuery


logger = logging.getLogger(__name__)

ENVIRONMENT_THRESHOLDS = {
    "temperature": {
        "warning_high": float(os.getenv("POULTRY_TEMP_WARNING_HIGH", 30)),
        "critical_high": float(os.getenv("POULTRY_TEMP_CRITICAL_HIGH", 35)),
        "warning_low": float(os.getenv("POULTRY_TEMP_WARNING_LOW", 18)),
        "critical_low": float(os.getenv("POULTRY_TEMP_CRITICAL_LOW", 12)),
    },
    "humidity": {
        "warning_high": float(os.getenv("POULTRY_HUM_WARNING_HIGH", 70)),
        "critical_high": float(os.getenv("POULTRY_HUM_CRITICAL_HIGH", 85)),
        "warning_low": float(os.getenv("POULTRY_HUM_WARNING_LOW", 40)),
        "critical_low": float(os.getenv("POULTRY_HUM_CRITICAL_LOW", 30)),
    },
}

DEFAULT_LOCATION = {
    "lat": float(os.getenv("DEFAULT_FARM_LAT", 18.5204)),
    "lon": float(os.getenv("DEFAULT_FARM_LON", 73.8567)),
}

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LAST_READING_CACHE = PROJECT_ROOT / ".last_environment_reading.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_humidity(value):
    if value is None:
        return None
    value = float(value)
    return value * 100 if 0 <= value <= 1.5 else value


def get_farm_location(farm_id: str) -> dict:
    try:
        rows = executeQuery(
            "SELECT latitude, longitude FROM Farmers WHERE farmer_id = %s",
            (farm_id,),
        )
        if rows and rows[0]["latitude"] is not None and rows[0]["longitude"] is not None:
            return {"lat": float(rows[0]["latitude"]), "lon": float(rows[0]["longitude"])}
    except Exception as exc:
        logger.warning("Could not load farm location for %s: %s", farm_id, exc)
    return DEFAULT_LOCATION


def fetch_openweather_reading(farm_id: str, lat: float | None = None, lon: float | None = None) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENWEATHER_API_KEY is not configured")

    location = {"lat": lat, "lon": lon} if lat is not None and lon is not None else get_farm_location(farm_id)
    query = urlencode(
        {
            "lat": location["lat"],
            "lon": location["lon"],
            "appid": api_key,
            "units": "metric",
        }
    )
    url = f"https://api.openweathermap.org/data/2.5/weather?{query}"

    try:
        with urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"Weather API request failed: {exc}") from exc

    return {
        "farm_id": str(farm_id),
        "temperature": float(payload["main"]["temp"]),
        "humidity": float(payload["main"]["humidity"]),
        "timestamp": utc_now_iso(),
        "source": "openweather",
        "stale": False,
    }


def evaluate_environment(temperature: float, humidity: float) -> tuple[str, list[dict]]:
    humidity = normalize_humidity(humidity)
    alerts = []

    checks = [
        ("temperature", float(temperature), ENVIRONMENT_THRESHOLDS["temperature"], "C"),
        ("humidity", float(humidity), ENVIRONMENT_THRESHOLDS["humidity"], "%"),
    ]

    status = "NORMAL"
    for parameter, value, thresholds, unit in checks:
        if value >= thresholds["critical_high"]:
            status = "CRITICAL"
            alerts.append(build_alert(parameter, value, thresholds["critical_high"], "CRITICAL", "above", unit))
        elif value <= thresholds["critical_low"]:
            status = "CRITICAL"
            alerts.append(build_alert(parameter, value, thresholds["critical_low"], "CRITICAL", "below", unit))
        elif value >= thresholds["warning_high"] and status != "CRITICAL":
            status = "WARNING"
            alerts.append(build_alert(parameter, value, thresholds["warning_high"], "WARNING", "above", unit))
        elif value <= thresholds["warning_low"] and status != "CRITICAL":
            status = "WARNING"
            alerts.append(build_alert(parameter, value, thresholds["warning_low"], "WARNING", "below", unit))

    return status, alerts


def build_alert(parameter: str, value: float, threshold: float, severity: str, direction: str, unit: str) -> dict:
    label = "Temperature" if parameter == "temperature" else "Humidity"
    action = (
        "Verify ventilation, drinking water, stocking density, and flock behavior."
        if parameter == "temperature"
        else "Check litter moisture, ventilation, and air exchange."
    )
    return {
        "parameter": parameter,
        "value": round(float(value), 2),
        "threshold": round(float(threshold), 2),
        "severity": severity,
        "timestamp": utc_now_iso(),
        "message": (
            f"Environmental stress/risk detected — further investigation required. {label} is {direction} the configured "
            f"threshold. Current {label.lower()}: {value:.2f}{unit}. {action}"
        ),
    }


def save_last_valid(reading: dict) -> None:
    try:
        LAST_READING_CACHE.write_text(json.dumps(reading), encoding="utf-8")
    except OSError as exc:
        logger.warning("Could not save last environment reading: %s", exc)


def load_last_valid(farm_id: str) -> dict | None:
    try:
        if LAST_READING_CACHE.exists():
            reading = json.loads(LAST_READING_CACHE.read_text(encoding="utf-8"))
            if str(reading.get("farm_id")) == str(farm_id):
                reading["stale"] = True
                return reading
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not load last environment reading: %s", exc)

    try:
        rows = executeQuery(
            """
            SELECT farm_id, temperature, humidity, timestamp, source, status
            FROM environment_readings
            WHERE farm_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
            """,
            (farm_id,),
        )
        if rows:
            row = rows[0]
            return {
                "farm_id": str(row["farm_id"]),
                "temperature": float(row["temperature"]),
                "humidity": float(row["humidity"]),
                "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
                "source": row["source"],
                "status": row["status"],
                "stale": True,
            }
    except Exception as exc:
        logger.warning("Could not query last environment reading: %s", exc)
    return None


def store_reading(reading: dict, status: str) -> None:
    executeQuery(
        """
        INSERT INTO environment_readings
            (farm_id, temperature, humidity, timestamp, source, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            reading["farm_id"],
            reading["temperature"],
            reading["humidity"],
            reading["timestamp"].replace("T", " ").replace("+00:00", ""),
            reading.get("source", "openweather"),
            status,
        ),
    )


def store_alerts(farm_id: str, alerts: list[dict]) -> None:
    for alert in alerts:
        executeQuery(
            """
            INSERT INTO environment_alerts
                (farm_id, parameter, value, threshold, severity, message, timestamp, resolved)
            VALUES (%s, %s, %s, %s, %s, %s, %s, FALSE)
            """,
            (
                farm_id,
                alert["parameter"],
                alert["value"],
                alert["threshold"],
                alert["severity"],
                alert["message"],
                utc_now_iso().replace("T", " ").replace("+00:00", ""),
            ),
        )


def current_environment(farm_id: str, lat: float | None = None, lon: float | None = None) -> dict:
    try:
        reading = fetch_openweather_reading(farm_id, lat=lat, lon=lon)
        status, alerts = evaluate_environment(reading["temperature"], reading["humidity"])
        reading["status"] = status
        save_last_valid(reading)
        try:
            store_reading(reading, status)
            store_alerts(farm_id, alerts)
        except Exception as exc:
            logger.warning("Could not persist environment reading/alerts: %s", exc)
        return {
            **reading,
            "environment_status": status,
            "alert": bool(alerts),
            "alerts": alerts,
            "data_available": True,
            "message": "Current weather API reading.",
        }
    except Exception as exc:
        logger.error("Environment API unavailable: %s", exc)
        stale = load_last_valid(farm_id)
        if stale:
            status, alerts = evaluate_environment(stale["temperature"], stale["humidity"])
            return {
                **stale,
                "environment_status": status,
                "alert": bool(alerts),
                "alerts": alerts,
                "data_available": False,
                "stale": True,
                "message": "Data temporarily unavailable; showing last valid reading.",
            }
        return {
            "farm_id": str(farm_id),
            "temperature": None,
            "humidity": None,
            "environment_status": "UNAVAILABLE",
            "timestamp": utc_now_iso(),
            "alert": False,
            "alerts": [],
            "data_available": False,
            "stale": True,
            "message": "Data temporarily unavailable.",
        }


def get_history(farm_id: str, limit: int = 100) -> list[dict]:
    rows = executeQuery(
        """
        SELECT id, farm_id, temperature, humidity, timestamp, source, status
        FROM environment_readings
        WHERE farm_id = %s
        ORDER BY timestamp DESC
        LIMIT %s
        """,
        (farm_id, limit),
    )
    return rows


def get_alerts(farm_id: str, limit: int = 50) -> list[dict]:
    rows = executeQuery(
        """
        SELECT id, farm_id, parameter, value, threshold,
               severity, message, timestamp, resolved
        FROM environment_alerts
        WHERE farm_id = %s
        ORDER BY timestamp DESC
        LIMIT %s
        """,
        (farm_id, limit),
    )
    return rows
