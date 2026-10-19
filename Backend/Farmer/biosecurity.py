"""Farm-scoped persistence helpers used by the Farmer API.

This module deliberately contains no medical diagnosis rules.  It only records
farmer observations and turns configured threshold/risk signals into alerts.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta

from utlis.db_utlis import executeQuery


def create_alert(farmer_id, category, severity, title, description, alert_key=None, cooldown_minutes=30):
    """Create an in-app alert unless an equivalent active alert is still cooling down."""
    try:
        if alert_key:
            recent = executeQuery(
                """SELECT alert_id FROM farmer_alerts WHERE farmer_id=%s AND alert_key=%s
                   AND status <> 'Resolved' AND created_at >= %s LIMIT 1""",
                (farmer_id, alert_key, datetime.utcnow() - timedelta(minutes=cooldown_minutes)),
            )
            if recent:
                return None
        executeQuery(
            """INSERT INTO farmer_alerts (farmer_id, category, severity, title, description, alert_key)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (farmer_id, category, severity, title, description, alert_key),
        )
        return True
    except Exception as exc:
        print(f"[WARN] create_alert failed: {exc}")
        return False


def json_value(value):
    return json.dumps(value) if value is not None else None


def mortality_analytics(farmer_id):
    try:
        totals_rows = executeQuery(
            """SELECT COALESCE(SUM(death_count),0) AS total,
                COALESCE(SUM(CASE WHEN (recorded_at)::date = CURRENT_DATE THEN death_count ELSE 0 END),0) AS today,
                COALESCE(SUM(CASE WHEN recorded_at >= CURRENT_DATE - INTERVAL '7 days' THEN death_count ELSE 0 END),0) AS week,
                COALESCE(SUM(CASE WHEN recorded_at >= CURRENT_DATE - INTERVAL '1 month' THEN death_count ELSE 0 END),0) AS month
               FROM mortality_records WHERE farmer_id=%s""", (farmer_id,))
        totals = totals_rows[0] if totals_rows else {"total": 0, "today": 0, "week": 0, "month": 0}

        farmer_rows = executeQuery("SELECT total_birds FROM farmers WHERE farmer_id=%s", (farmer_id,))
        birds = (farmer_rows[0].get("total_birds") or 0) if farmer_rows else 0

        trend = executeQuery(
            """SELECT (recorded_at)::date AS day, SUM(death_count) AS deaths FROM mortality_records
               WHERE farmer_id=%s AND recorded_at >= CURRENT_DATE - INTERVAL '30 days'
               GROUP BY (recorded_at)::date ORDER BY day""", (farmer_id,))
        if not isinstance(trend, list):
            trend = []

        totals["mortality_rate"] = round((float(totals.get("total", 0)) / birds * 100), 2) if birds else None
        totals["flock_population"] = birds
        totals["trend"] = trend
        return totals
    except Exception as exc:
        print(f"[WARN] mortality_analytics failed ({exc})")

    return {
        "total": 0,
        "today": 0,
        "week": 0,
        "month": 0,
        "mortality_rate": None,
        "flock_population": 0,
        "trend": []
    }
