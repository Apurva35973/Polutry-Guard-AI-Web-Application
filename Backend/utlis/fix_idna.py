"""
Fixes LookupError: unknown encoding: idna in environments where the IDNA codec
is not preloaded before worker threads start, or under non-standard Python runtimes.
"""
import codecs

# 1. Preload standard encodings.idna module
try:
    import encodings.idna
except ImportError:
    pass

# 2. Verify idna codec is registered, or register custom bridge using the idna package
try:
    codecs.lookup("idna")
except LookupError:
    try:
        import idna

        def _idna_search(encoding_name):
            clean = str(encoding_name).lower().replace("-", "_")
            if clean in ("idna", "idna_codec"):
                def _encode(input, errors="strict"):
                    if isinstance(input, bytes):
                        input = input.decode("utf-8", errors=errors)
                    return idna.encode(input), len(input)

                def _decode(input, errors="strict"):
                    if isinstance(input, str):
                        input = input.encode("ascii", errors=errors)
                    return idna.decode(input), len(input)

                return codecs.CodecInfo(
                    name="idna",
                    encode=_encode,
                    decode=_decode,
                )
            return None

        codecs.register(_idna_search)
        print("[INFO] Registered custom IDNA codec bridge successfully.")
    except Exception as e:
        print(f"[WARN] Failed registering custom IDNA codec bridge: {e}")
