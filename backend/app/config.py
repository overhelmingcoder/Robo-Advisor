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


def _csv_env(name: str) -> list[str]:
    return [
        item.strip()
        for item in os.getenv(name, "").split(",")
        if item.strip()
    ]


# ── Provider config ─────────────────────────────────────────────────────────────
LITE_LLM_URL = os.getenv("LITE_LLM_URL") or os.getenv("LITELLM_URL")
LITE_LLM_API_KEY = os.getenv("LITELLM_MASTER_KEY") or os.getenv("LITELLM_API_KEY")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
SITE_URL = os.getenv("SITE_URL", "http://localhost:5173")
APP_TITLE = os.getenv("APP_TITLE", "Bangladesh Robo-Advisor")

CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_AI_GATEWAY_ID = os.getenv("CLOUDFLARE_AI_GATEWAY_ID", "default")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
USE_CLOUDFLARE_AI_GATEWAY = os.getenv("USE_CLOUDFLARE_AI_GATEWAY", "1") == "1"
CLOUDFLARE_OPENROUTER_URL = (
    f"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/"
    f"{CLOUDFLARE_AI_GATEWAY_ID}/openrouter/chat/completions"
) if CLOUDFLARE_ACCOUNT_ID else ""
CLOUDFLARE_OPENROUTER_V1_URL = (
    f"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/"
    f"{CLOUDFLARE_AI_GATEWAY_ID}/openrouter/v1/chat/completions"
) if CLOUDFLARE_ACCOUNT_ID else ""

MODEL = os.getenv("LITELLM_MODEL", OPENROUTER_MODEL)
MODEL_FALLBACKS = _csv_env("AI_MODEL_FALLBACKS")
AI_MODELS = list(dict.fromkeys([MODEL, *MODEL_FALLBACKS]))

if LITE_LLM_URL and LITE_LLM_API_KEY:
    # Prefer LiteLLM gateway when it's configured.
    _base = _normalize_lite_url(LITE_LLM_URL)
    AI_PROVIDER = "LiteLLM"
    AI_URL = _base.rstrip("/") + "/v1/chat/completions"
    AI_API_KEY = LITE_LLM_API_KEY
elif USE_CLOUDFLARE_AI_GATEWAY and CLOUDFLARE_OPENROUTER_URL:
    AI_PROVIDER = "Cloudflare AI Gateway"
    AI_URL = CLOUDFLARE_OPENROUTER_URL
    AI_API_KEY = OPENROUTER_API_KEY
else:
    AI_PROVIDER = "OpenRouter"
    AI_URL = OPENROUTER_URL
    AI_API_KEY = OPENROUTER_API_KEY

AI_ERROR_SOURCE = AI_PROVIDER
AI_URLS = [AI_URL]
if AI_PROVIDER == "Cloudflare AI Gateway" and CLOUDFLARE_OPENROUTER_V1_URL:
    AI_URLS.append(CLOUDFLARE_OPENROUTER_V1_URL)

# ── Tuning knobs ───────────────────────────────────────────────────────────────
OPENROUTER_MAX_ITER = int(os.getenv("OPENROUTER_MAX_ITER", "2"))
OPENROUTER_TEMP = float(os.getenv("OPENROUTER_TEMP", "0.0"))
OPENROUTER_TIMEOUT = int(os.getenv("OPENROUTER_TIMEOUT", "30"))
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "900"))
CHAT_MAX_TOKENS = int(os.getenv("CHAT_MAX_TOKENS", "420"))

CACHE_TTL = int(os.getenv("OPENROUTER_CACHE_TTL", "300"))
FAST_RETURN = os.getenv("FAST_RETURN", "1") == "1"
FAST_ENRICH = os.getenv("FAST_ENRICH", "1") == "1"

# ── API config ────────────────────────────────────────────────────────────────
_DEPLOYED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    *_DEPLOYED_ORIGINS,
]
ALLOWED_ORIGIN_REGEX = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"https://.*\.vercel\.app",
)

# ── Runtime state ─────────────────────────────────────────────────────────────
# Simple in-memory cache for recommendations: {key: (ts, result_json)}
CACHE: dict = {}
