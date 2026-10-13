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
                """SELECT alert_id FROM Farmer_Alerts WHERE farmer_id=%s AND alert_key=%s
                   AND status <> 'Resolved' AND created_at >= %s LIMIT 1""",
                (farmer_id, alert_key, datetime.utcnow() - timedelta(minutes=cooldown_minutes)),
            )
            if recent:
                return None
        executeQuery(
            """INSERT INTO Farmer_Alerts (farmer_id, category, severity, title, description, alert_key)
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
            """SELECT COALESCE(SUM(death_count),0) total,
                COALESCE(SUM(CASE WHEN DATE(recorded_at)=CURDATE() THEN death_count ELSE 0 END),0) today,
                COALESCE(SUM(CASE WHEN recorded_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN death_count ELSE 0 END),0) week,
                COALESCE(SUM(CASE WHEN recorded_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN death_count ELSE 0 END),0) month
               FROM Mortality_Records WHERE farmer_id=%s""", (farmer_id,))
        totals = totals_rows[0] if totals_rows else {"total": 0, "today": 0, "week": 0, "month": 0}

        farmer_rows = executeQuery("SELECT total_birds FROM Farmers WHERE farmer_id=%s", (farmer_id,))
        birds = (farmer_rows[0].get("total_birds") or 0) if farmer_rows else 0

        trend = executeQuery(
            """SELECT DATE(recorded_at) day, SUM(death_count) deaths FROM Mortality_Records
               WHERE farmer_id=%s AND recorded_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
               GROUP BY DATE(recorded_at) ORDER BY day""", (farmer_id,))
        if not isinstance(trend, list):
            trend = []

        totals["mortality_rate"] = round((float(totals.get("total", 0)) / birds * 100), 2) if birds else None
        totals["flock_population"] = birds
        totals["trend"] = trend
        return totals
    except Exception as exc:
        print(f"[WARN] MySQL mortality_analytics failed ({exc}), attempting Supabase fallback.")

    # Supabase fallback
    try:
        from services.sync_service import execute_supabase_rest
        ok, mort_rows = execute_supabase_rest("GET", f"mortality_records?farmer_id=eq.{farmer_id}&order=recorded_at.desc")
        records = mort_rows if (ok and isinstance(mort_rows, list)) else []

        ok_farmer, f_rows = execute_supabase_rest("GET", f"farmers?farmer_id=eq.{farmer_id}&limit=1")
        birds = (f_rows[0].get("total_birds") or 0) if (ok_farmer and f_rows) else 0

        total_deaths = sum(int(r.get("death_count") or 0) for r in records)
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        today_deaths = 0
        week_deaths = 0
        month_deaths = 0
        daily_trends = {}

        for r in records:
            cnt = int(r.get("death_count") or 0)
            rec_raw = str(r.get("recorded_at") or "")
            rec_date_str = rec_raw[:10]
            if rec_date_str == today_str:
                today_deaths += cnt
            try:
                rec_dt = datetime.fromisoformat(rec_raw.replace("Z", "+00:00").split("+")[0])
                if rec_dt >= week_ago:
                    week_deaths += cnt
                if rec_dt >= month_ago:
                    month_deaths += cnt
                    daily_trends[rec_date_str] = daily_trends.get(rec_date_str, 0) + cnt
            except Exception:
                pass

        trend = [{"day": day, "deaths": cnt} for day, cnt in sorted(daily_trends.items())]
        mort_rate = round((float(total_deaths) / birds * 100), 2) if birds else None

        return {
            "total": total_deaths,
            "today": today_deaths,
            "week": week_deaths,
            "month": month_deaths,
            "mortality_rate": mort_rate,
            "flock_population": birds,
            "trend": trend,
        }
    except Exception as sp_exc:
        print(f"[WARN] Supabase mortality_analytics fallback failed: {sp_exc}")

    return {
        "total": 0,
        "today": 0,
        "week": 0,
        "month": 0,
        "mortality_rate": None,
        "flock_population": 0,
        "trend": []
    }
