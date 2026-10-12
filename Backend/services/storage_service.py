import os
import io
import uuid
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from werkzeug.utils import secure_filename
from PIL import Image

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uhgbahpyfzbficruiaos.supabase.co").strip().rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8].rstrip("/")

SUPABASE_SERVICE_ROLE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    or os.environ.get("SUPABASE_KEY", "").strip()
    or os.environ.get("SUPABASE_ANON_KEY", "").strip()
)

POULTRY_IMAGES_BUCKET = "poultry-images"
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_image_stream(stream_or_bytes, filename=None):
    """
    Validates file extension, byte length, and verifies image integrity via PIL.
    Returns (True, image_bytes, content_type) or (False, error_message, None).
    """
    if filename:
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Allowed: JPG, PNG, WEBP.", None

    if hasattr(stream_or_bytes, "read"):
        if hasattr(stream_or_bytes, "seek"):
            stream_or_bytes.seek(0)
        data = stream_or_bytes.read()
    elif isinstance(stream_or_bytes, (bytes, bytearray)):
        data = bytes(stream_or_bytes)
    else:
        return False, "Invalid image stream type provided.", None

    if len(data) == 0:
        return False, "Uploaded image file is empty.", None

    if len(data) > MAX_IMAGE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB.", None

    try:
        pil_img = Image.open(io.BytesIO(data))
        pil_img.verify()
        fmt = (pil_img.format or "JPEG").upper()
        if fmt == "PNG":
            mime = "image/png"
        elif fmt == "WEBP":
            mime = "image/webp"
        else:
            mime = "image/jpeg"
        return True, data, mime
    except Exception as exc:
        return False, f"Corrupted or invalid image content: {str(exc)}", None


def upload_poultry_image(stream_or_bytes, farmer_id, original_filename):
    """
    Uploads a validated image to the private Supabase Storage bucket 'poultry-images'.
    Path structure: farms/{farmer_id}/{uuid[:8]}_{secure_filename}
    Returns (True, metadata_dict) or (False, error_msg).
    """
    valid, image_bytes, mime = validate_image_stream(stream_or_bytes, original_filename)
    if not valid:
        return False, image_bytes

    clean_name = secure_filename(original_filename) or "capture.jpg"
    unique_suffix = uuid.uuid4().hex[:8]
    storage_path = f"farms/{farmer_id}/{unique_suffix}_{clean_name}"

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{POULTRY_IMAGES_BUCKET}/{storage_path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": mime,
    }

    try:
        req = urllib.request.Request(upload_url, data=image_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.getcode() in (200, 201):
                return True, {
                    "bucket": POULTRY_IMAGES_BUCKET,
                    "storage_path": storage_path,
                    "file_size": len(image_bytes),
                    "mime_type": mime,
                    "image_bytes": image_bytes,
                }
            return False, f"Supabase Storage returned status {resp.getcode()}"
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8") if exc.fp else str(exc)
        logger.error(f"Supabase Storage upload error ({exc.code}): {body}")
        return False, f"Storage upload failed: {body}"
    except Exception as exc:
        logger.error(f"Supabase Storage network error: {str(exc)}")
        return False, f"Storage connection error: {str(exc)}"


def create_signed_image_url(storage_path, expires_in=3600):
    """
    Generates a secure temporary signed URL for an image in the private bucket.
    Expires in `expires_in` seconds (default 1 hour).
    Returns (True, full_url) or (False, error_msg).
    """
    if not storage_path:
        return False, "storage_path is required"

    clean_path = storage_path.lstrip("/")
    url = f"{SUPABASE_URL}/storage/v1/object/sign/{POULTRY_IMAGES_BUCKET}/{clean_path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = json.dumps({"expiresIn": expires_in}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.getcode() == 200:
                data = json.loads(resp.read().decode("utf-8"))
                relative_url = data.get("signedURL")
                if relative_url:
                    full_url = f"{SUPABASE_URL}{relative_url}"
                    return True, full_url
            return False, f"Supabase sign returned status {resp.getcode()}"
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8") if exc.fp else str(exc)
        return False, f"Signed URL generation failed: {body}"
    except Exception as exc:
        return False, f"Signed URL error: {str(exc)}"


def delete_poultry_image(storage_path):
    """
    Deletes an object from Supabase Storage if an upload rollback is necessary.
    """
    if not storage_path:
        return False, "storage_path is required"

    clean_path = storage_path.lstrip("/")
    url = f"{SUPABASE_URL}/storage/v1/object/{POULTRY_IMAGES_BUCKET}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    payload = json.dumps({"prefixes": [clean_path]}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=headers, method="DELETE")
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.getcode() in (200, 204), "Deleted"
    except Exception as exc:
        return False, str(exc)
