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


def json_value(value):
    return json.dumps(value) if value is not None else None


def mortality_analytics(farmer_id):
    totals = executeQuery(
        """SELECT COALESCE(SUM(death_count),0) total,
            COALESCE(SUM(CASE WHEN DATE(recorded_at)=CURDATE() THEN death_count ELSE 0 END),0) today,
            COALESCE(SUM(CASE WHEN recorded_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN death_count ELSE 0 END),0) week,
            COALESCE(SUM(CASE WHEN recorded_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) THEN death_count ELSE 0 END),0) month
           FROM Mortality_Records WHERE farmer_id=%s""", (farmer_id,))[0]
    birds = executeQuery("SELECT total_birds FROM Farmers WHERE farmer_id=%s", (farmer_id,))[0].get("total_birds") or 0
    trend = executeQuery(
        """SELECT DATE(recorded_at) day, SUM(death_count) deaths FROM Mortality_Records
           WHERE farmer_id=%s AND recorded_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY DATE(recorded_at) ORDER BY day""", (farmer_id,))
    totals["mortality_rate"] = round((float(totals["total"]) / birds * 100), 2) if birds else None
    totals["flock_population"] = birds
    totals["trend"] = trend
    return totals
