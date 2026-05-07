import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
ENV_PATHS = [
    BASE_DIR / ".env",
    PROJECT_ROOT / ".env",
]
for _path in ENV_PATHS:
    if _path.exists():
        load_dotenv(_path, override=False)


def _normalize_lite_url(raw: str | None) -> str:
    if not raw:
        return ""
    base = raw.strip()
    if "://" not in base:
        base = f"http://{base}"
    if base.endswith("/v1") or base.endswith("/v1/"):
        base = base.rstrip("/")
        base = base[:-3]
    return base.rstrip("/")


# ── Provider config ─────────────────────────────────────────────────────────────
LITE_LLM_URL = os.getenv("LITE_LLM_URL") or os.getenv("LITELLM_URL")
LITE_LLM_API_KEY = os.getenv("LITELLM_MASTER_KEY") or os.getenv("LITELLM_API_KEY")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")

MODEL = os.getenv("LITELLM_MODEL", os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet"))

if LITE_LLM_URL and LITE_LLM_API_KEY:
    # Prefer LiteLLM gateway when it's configured.
    _base = _normalize_lite_url(LITE_LLM_URL)
    AI_PROVIDER = "LiteLLM"
    AI_URL = _base.rstrip("/") + "/v1/chat/completions"
    AI_API_KEY = LITE_LLM_API_KEY
else:
    AI_PROVIDER = "OpenRouter"
    AI_URL = OPENROUTER_URL
    AI_API_KEY = OPENROUTER_API_KEY

AI_ERROR_SOURCE = "LiteLLM" if AI_PROVIDER == "LiteLLM" else "OpenRouter"

# ── Tuning knobs ───────────────────────────────────────────────────────────────
OPENROUTER_MAX_ITER = int(os.getenv("OPENROUTER_MAX_ITER", "2"))
OPENROUTER_TEMP = float(os.getenv("OPENROUTER_TEMP", "0.0"))
OPENROUTER_TIMEOUT = int(os.getenv("OPENROUTER_TIMEOUT", "30"))

CACHE_TTL = int(os.getenv("OPENROUTER_CACHE_TTL", "300"))
FAST_RETURN = os.getenv("FAST_RETURN", "1") == "1"
FAST_ENRICH = os.getenv("FAST_ENRICH", "1") == "1"

# ── API config ────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

# ── Runtime state ─────────────────────────────────────────────────────────────
# Simple in-memory cache for recommendations: {key: (ts, result_json)}
CACHE: dict = {}
