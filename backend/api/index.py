import os
import sys

# Ensure backend root is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)

for p in [CURRENT_DIR, PARENT_DIR]:
    if p in sys.path:
        sys.path.remove(p)

sys.path.insert(0, CURRENT_DIR)
sys.path.insert(0, PARENT_DIR)

try:
    from app.main import app
except Exception as e:
    import json
    import traceback
    error_trace = traceback.format_exc()
    error_msg = str(e)
    trace_lines = error_trace.splitlines()[-8:]
    print(f"CRITICAL STARTUP ERROR in backend/api/index.py:\n{error_trace}")

    async def app(scope, receive, send):
        if scope["type"] == "http":
            payload = json.dumps({
                "status": "error",
                "message": "Backend initialization failed on startup.",
                "detail": error_msg,
                "traceback": trace_lines
            }).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"access-control-allow-origin", b"*"],
                ],
            })
            await send({
                "type": "http.response.body",
                "body": payload,
            })

# Vercel Serverless Function entrypoint
app = app

