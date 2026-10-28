import os
import sys

# Ensure root and backend directory are in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for path in [BACKEND_DIR, ROOT_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    try:
        from app.main import app
    except ImportError:
        from backend.app.main import app
except Exception as e:
    import json
    import traceback
    error_trace = traceback.format_exc()
    print(f"CRITICAL STARTUP ERROR in api/index.py:\n{error_trace}")

    async def app(scope, receive, send):
        if scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        elif scope["type"] == "http":
            payload = json.dumps({
                "status": "error",
                "message": "Backend initialization failed on startup.",
                "detail": str(e),
                "traceback": error_trace.splitlines()[-8:]
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

