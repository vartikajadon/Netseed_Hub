import os
import sys

# Ensure backend root is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)

if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

try:
    try:
        from app.main import app
    except ImportError:
        from backend.app.main import app
except Exception as e:
    import json
    import traceback
    error_trace = traceback.format_exc()
    print(f"CRITICAL STARTUP ERROR in backend/api/index.py:\n{error_trace}")

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

