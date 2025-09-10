import hmac, hashlib, time
from typing import Tuple

def parse_signature_header(header: str) -> Tuple[int, str] | None:
    # header like: "t=1699999999,v1=hex"
    if not header:
        return None
    parts = dict(kv.split("=", 1) for kv in header.split(",") if "=" in kv)
    if "t" not in parts or "v1" not in parts:
        return None
    try:
        return int(parts["t"]), parts["v1"]
    except ValueError:
        return None

def compute_hmac(secret: str, timestamp: int, body: bytes) -> str:
    msg = f"{timestamp}.".encode("utf-8") + body  # simple version: "t.body"
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

def verify_signature(body: bytes, header: str, secret: str, tolerance_seconds: int) -> bool:
    parsed = parse_signature_header(header)
    if not parsed:
        return False
    t, sig = parsed
    now = int(time.time())
    if abs(now - t) > tolerance_seconds:
        return False
    expected = compute_hmac(secret, t, body)
    # constant-time compare
    return hmac.compare_digest(expected, sig)
