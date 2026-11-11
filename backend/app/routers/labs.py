from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.mode import current_mode, is_training
from app.db import get_db
from app.deps import Principal, current_principal, require_roles
from app.integration.ctf import integration_status
from app.models import SimulatedEmail, SecurityLab, User

router = APIRouter(tags=["labs"])
settings = get_settings()


def lab_public(l: SecurityLab) -> dict:
    return {
        "lab_id": l.lab_id,
        "name": l.name,
        "difficulty": l.difficulty,
        "category": l.category,
        "scenario": l.scenario,
        "objectives": l.objectives,
        "start_path": l.start_path,
        "target_endpoint": l.target_endpoint,
        "hints": l.hints,
        "remediation": l.remediation,
        "references": l.references,
        "enabled": l.enabled,
        "active_in_current_mode": l.enabled and is_training(),
    }


@router.get("/api/labs")
def list_labs(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.query(SecurityLab).order_by(SecurityLab.lab_id).all()
    return {"mode": current_mode(), "scoring": "external", "labs": [lab_public(l) for l in rows]}


@router.get("/api/labs/{lab_id}")
def get_lab(lab_id: str, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    lab = db.query(SecurityLab).filter(SecurityLab.lab_id == lab_id).first()
    if not lab:
        raise HTTPException(404, "Lab not found")
    return lab_public(lab)


@router.get("/api/integration/contract")
def contract(principal: Principal = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rows = db.query(SecurityLab).order_by(SecurityLab.lab_id).all()
    return {
        "version": "1.0",
        "status": integration_status(),
        "labs": [{"lab_id": l.lab_id, "name": l.name, "difficulty": l.difficulty, "category": l.category} for l in rows],
        "event": {
            "type": "lab.objective_reached",
            "fields": ["lab_id", "participant", "mode", "occurred_at"],
            "note": "Flags are never sent. The external platform owns validation, scoring and completion tracking.",
        },
    }


@router.get("/api/health")
def health():
    return {"status": "ok", "mode": current_mode()}


@router.get("/api/dev/mailbox")
def mailbox(email: str, db: Session = Depends(get_db)):
    if not is_training():
        raise HTTPException(404, "Not found")
    rows = db.query(SimulatedEmail).filter(SimulatedEmail.to_address == email.lower()).order_by(SimulatedEmail.id.desc()).limit(10).all()
    return [{"subject": r.subject, "body": r.body, "sent_at": r.created_at.isoformat()} for r in rows]
