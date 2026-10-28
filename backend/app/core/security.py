import os
import hashlib
import hmac
import logging

logger = logging.getLogger(__name__)

try:
    import bcrypt
    _HAS_BCRYPT = True
except ImportError:
    bcrypt = None
    _HAS_BCRYPT = False
    logger.warning("bcrypt module not installed; fallback password hasher active.")

DEFAULT_TEMPORARY_PASSWORD = "Welcome@2026"

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt with standard hashlib fallback."""
    if not plain_password:
        return ""
    if _HAS_BCRYPT and bcrypt is not None:
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
        return hashed.decode("utf-8")
    else:
        # Fallback salted SHA-256
        salt = os.urandom(16).hex()
        digest = hashlib.sha256(f"{salt}${plain_password}".encode("utf-8")).hexdigest()
        return f"pbkdf2_sha256${salt}${digest}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt or fallback hash."""
    if not plain_password or not hashed_password:
        return False
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        if _HAS_BCRYPT and bcrypt is not None:
            try:
                return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
            except Exception:
                return False
        return False
    elif hashed_password.startswith("pbkdf2_sha256$"):
        try:
            parts = hashed_password.split("$")
            if len(parts) == 3:
                salt, expected_digest = parts[1], parts[2]
                computed = hashlib.sha256(f"{salt}${plain_password}".encode("utf-8")).hexdigest()
                return hmac.compare_digest(computed, expected_digest)
        except Exception:
            return False
    return False
