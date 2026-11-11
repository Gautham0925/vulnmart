import time

from app.core.config import get_settings
from app.db import SessionLocal
from app.models import AppSetting

settings = get_settings()
_cache = {"value": None, "at": 0.0}


def current_mode() -> str:
    if not settings.training_allowed:
        return "secure"
    now = time.monotonic()
    if _cache["value"] is not None and now - _cache["at"] < 1.0:
        return _cache["value"]
    with SessionLocal() as db:
        row = db.get(AppSetting, "mode")
        value = row.value if row else settings.app_mode
    if value not in ("training", "secure"):
        value = "secure"
    _cache["value"] = value
    _cache["at"] = now
    return value


def is_training() -> bool:
    return current_mode() == "training"


def set_mode(db, mode: str) -> str:
    if mode not in ("training", "secure"):
        raise ValueError("invalid mode")
    if mode == "training" and not settings.training_allowed:
        raise PermissionError("training mode is disabled in this environment")
    row = db.get(AppSetting, "mode")
    if row:
        row.value = mode
    else:
        db.add(AppSetting(key="mode", value=mode))
    db.commit()
    _cache["value"] = mode
    _cache["at"] = time.monotonic()
    return mode
