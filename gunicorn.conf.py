import os
import codecs

# Preload IDNA encoding before worker threads are spawned
try:
    import encodings.idna
except ImportError:
    pass

try:
    codecs.lookup("idna")
except LookupError:
    try:
        import idna
        def _idna_search(encoding_name):
            if str(encoding_name).lower().replace("-", "_") in ("idna", "idna_codec"):
                def _encode(input, errors="strict"):
                    if isinstance(input, bytes):
                        input = input.decode("utf-8", errors=errors)
                    return idna.encode(input), len(input)
                def _decode(input, errors="strict"):
                    if isinstance(input, str):
                        input = input.encode("ascii", errors=errors)
                    return idna.decode(input), len(input)
                return codecs.CodecInfo(name="idna", encode=_encode, decode=_decode)
            return None
        codecs.register(_idna_search)
    except Exception:
        pass

# Restrict thread pools to 1 thread to stay strictly under Render's 512MB RAM limit
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["TORCH_NUM_THREADS"] = "1"

# Render dynamically assigns PORT, defaulting to 10000 on Render web services
port = os.environ.get("PORT", "10000")
bind = f"0.0.0.0:{port}"
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
threads = int(os.environ.get("PYTHON_GET_THREADS", "2"))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
accesslog = "-"
errorlog = "-"
