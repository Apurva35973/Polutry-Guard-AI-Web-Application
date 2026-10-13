from pathlib import Path
import os
import sys

backend_dir = str(Path(__file__).resolve().parent / "Backend")
project_root = str(Path(__file__).resolve().parent)
for p in (backend_dir, project_root):
    if p not in sys.path:
        sys.path.insert(0, p)

import utlis.fix_idna
from Backend.app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
