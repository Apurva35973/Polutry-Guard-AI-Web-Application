import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

THINGSPEAK_BASE_URL = "https://api.thingspeak.com"
FRESHNESS_THRESHOLD_SECONDS = 300  # 5 minutes threshold for IoT freshness

def safe_float(val):
    """Safely converts string or number to float, returns None if empty or invalid."""
    if val is None:
        return None
    try:
        s = str(val).strip()
        if not s or s.lower() == 'nan':
            return None
        return round(float(s), 2)
    except (ValueError, TypeError):
        return None

def parse_iso_datetime(dt_str):
    """Parses ThingSpeak ISO8601 datetime string to timezone-aware UTC datetime."""
    if not dt_str:
        return None
    try:
        # Replace 'Z' with UTC offset for robust parsing
        clean_str = dt_str.strip().replace('Z', '+00:00')
        return datetime.fromisoformat(clean_str)
    except Exception:
        return None

def test_thingspeak_connection(channel_id, read_api_key=None):
    """
    Tests connectivity to a ThingSpeak channel using channel_id and optional read_api_key.
    Uses /channels/{id}/feeds.json?results=1 so that credentials can be validated even
    if the channel has zero feeds published yet.
    Returns a dict with success boolean and channel info or error message.
    """
    if not channel_id:
        return {"success": False, "error": "ThingSpeak Channel ID is required."}

    clean_channel_id = str(channel_id).strip()
    url = f"{THINGSPEAK_BASE_URL}/channels/{clean_channel_id}/feeds.json?results=1"
    if read_api_key and str(read_api_key).strip():
        url += f"&api_key={str(read_api_key).strip()}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PoultryGuard-IoT-Client/1.0", "Accept": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            if status_code != 200:
                return {"success": False, "error": f"ThingSpeak returned HTTP status {status_code}"}
            
            raw_data = resp.read().decode('utf-8')
            data = json.loads(raw_data)
            if not isinstance(data, dict):
                return {"success": False, "error": "Unexpected response format from ThingSpeak."}

            channel_info = data.get("channel", {})
            channel_name = channel_info.get("name", f"Channel {clean_channel_id}")
            feeds = data.get("feeds", [])

            if feeds and len(feeds) > 0:
                latest = feeds[-1]
                return {
                    "success": True,
                    "channel_id": clean_channel_id,
                    "channel_name": channel_name,
                    "last_entry_id": latest.get("entry_id"),
                    "created_at": latest.get("created_at"),
                    "has_data": True,
                    "sample_payload": {
                        "temperature": safe_float(latest.get("field1")),
                        "humidity": safe_float(latest.get("field2")),
                        "ammonia": safe_float(latest.get("field3")),
                        "vocalization_activity": safe_float(latest.get("field4"))
                    }
                }
            else:
                return {
                    "success": True,
                    "channel_id": clean_channel_id,
                    "channel_name": channel_name,
                    "last_entry_id": None,
                    "created_at": channel_info.get("created_at"),
                    "has_data": False,
                    "message": f"Channel '{channel_name}' verified successfully! No feeds published yet. Telemetry will sync once ESP8266 begins transmitting.",
                    "sample_payload": {
                        "temperature": None,
                        "humidity": None,
                        "ammonia": None,
                        "vocalization_activity": None
                    }
                }
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return {"success": False, "error": "Invalid channel ID or unauthorized (read API key required for private channels)."}
        elif e.code in (401, 403):
            return {"success": False, "error": "Unauthorized: Read API key is invalid or missing."}
        return {"success": False, "error": f"ThingSpeak HTTP error: {e.code} {e.reason}"}
    except urllib.error.URLError as e:
        return {"success": False, "error": f"Network error connecting to ThingSpeak: {str(e.reason)}"}
    except Exception as e:
        return {"success": False, "error": f"Error validating ThingSpeak channel: {str(e)}"}

def fetch_latest_telemetry(channel_id, read_api_key=None):
    """
    Fetches the latest telemetry entry from ThingSpeak for a given channel.
    Calculates entry age and determines whether telemetry is 'fresh' (<= 300s) or 'stale' (> 300s).
    """
    if not channel_id:
        return {"success": False, "error": "Channel ID not configured"}

    clean_channel_id = str(channel_id).strip()
    url = f"{THINGSPEAK_BASE_URL}/channels/{clean_channel_id}/feeds/last.json"
    if read_api_key and str(read_api_key).strip():
        url += f"?api_key={str(read_api_key).strip()}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PoultryGuard-IoT-Client/1.0", "Accept": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_data = resp.read().decode('utf-8')
            if not raw_data or raw_data.strip() == "-1":
                return {
                    "success": False,
                    "no_data": True,
                    "error": "Channel connected, but no telemetry entries published yet by ESP8266."
                }

            feed = json.loads(raw_data)
            if not isinstance(feed, dict) or not feed:
                return {
                    "success": False,
                    "no_data": True,
                    "error": "No telemetry data recorded yet in ThingSpeak channel."
                }

            entry_id = feed.get("entry_id")
            created_at_str = feed.get("created_at")

            if not created_at_str:
                return {"success": False, "no_data": True, "error": "Empty or pending telemetry entry from ThingSpeak."}

            created_at_dt = parse_iso_datetime(created_at_str)
            now_utc = datetime.now(timezone.utc)

            age_seconds = None
            is_fresh = False
            if created_at_dt:
                age_seconds = max(0, int((now_utc - created_at_dt).total_seconds()))
                is_fresh = (age_seconds <= FRESHNESS_THRESHOLD_SECONDS)

            temperature = safe_float(feed.get("field1"))
            humidity = safe_float(feed.get("field2"))
            ammonia = safe_float(feed.get("field3"))
            vocalization = safe_float(feed.get("field4"))

            return {
                "success": True,
                "entry_id": entry_id,
                "recorded_at": created_at_str,
                "age_seconds": age_seconds,
                "is_fresh": is_fresh,
                "device_status": "Online" if is_fresh else "Offline",
                "telemetry": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "ammonia": ammonia,
                    "vocalization_activity": vocalization
                },
                "raw_feed": feed
            }
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return {"success": False, "error": "Invalid channel ID or unauthorized read key."}
        return {"success": False, "error": f"ThingSpeak HTTP Error {e.code}"}
    except urllib.error.URLError as e:
        return {"success": False, "error": f"ThingSpeak Connection Error: {str(e.reason)}"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error reading ThingSpeak: {str(e)}"}

def mask_api_key(key):
    """Masks API keys for admin display, showing only the first and last 3 characters."""
    if not key:
        return None
    s = str(key).strip()
    if len(s) <= 6:
        return "******"
    return f"{s[:3]}****{s[-3:]}"
