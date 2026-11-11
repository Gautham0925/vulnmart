import threading
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings

settings = get_settings()


def integration_status() -> dict:
    return {
        "enabled": settings.ctf_enabled and bool(settings.ctf_base_url),
        "base_url_configured": bool(settings.ctf_base_url),
        "event_path": settings.ctf_event_path,
        "owns": ["flag_validation", "scoring", "submissions", "completion_tracking"],
        "local_app_responsibility": ["host_vulnerable_scenarios", "reveal_static_flag_on_objective"],
    }


def _post(url: str, headers: dict, payload: dict) -> None:
    try:
        httpx.post(url, json=payload, headers=headers, timeout=settings.ctf_timeout_seconds)
    except Exception:
        pass


def emit_objective_event(lab_id: str, participant: str, mode: str) -> None:
    if not (settings.ctf_enabled and settings.ctf_base_url):
        return
    payload = {
        "event": "lab.objective_reached",
        "lab_id": lab_id,
        "participant": participant,
        "mode": mode,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    headers = {"Authorization": f"Bearer {settings.ctf_api_token}"} if settings.ctf_api_token else {}
    url = settings.ctf_base_url.rstrip("/") + settings.ctf_event_path
    threading.Thread(target=_post, args=(url, headers, payload), daemon=True).start()
