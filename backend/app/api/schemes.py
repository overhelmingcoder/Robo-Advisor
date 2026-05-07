from fastapi import APIRouter

from app.config import MODEL
from app.data import SCHEMES
from app.config import AI_PROVIDER, AI_URL

router = APIRouter()


@router.get("/schemes")
def list_schemes():
    return SCHEMES


@router.get("/health")
def health():
    return {
        "status": "ok",
        "schemes_loaded": len(SCHEMES),
        "provider": AI_PROVIDER,
        "provider_url": AI_URL,
        "model": MODEL,
    }
