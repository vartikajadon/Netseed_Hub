import os
import sys

# Ensure root and backend directory are in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for path in [ROOT_DIR, BACKEND_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

# Vercel Serverless Function entrypoint
app = app
