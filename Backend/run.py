import os
import sys
from pathlib import Path

# Ensure Backend directory is on sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app import app, create_app
except ImportError:
    from .app import app, create_app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Poultry Guard AI backend on {host}:{port}...")
    app.run(host=host, port=port, debug=False)


