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
    print("Starting the Flask application...")
    app.run(host='127.0.0.1', port=5000, debug=True)

