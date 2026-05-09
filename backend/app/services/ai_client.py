import logging
from copy import deepcopy

import httpx
from fastapi import HTTPException

from app.config import (
    AI_API_KEY,
    AI_ERROR_SOURCE,
    AI_MODELS,
    AI_PROVIDER,
    AI_URLS,
    APP_TITLE,
    CLOUDFLARE_API_TOKEN,
    OPENROUTER_TIMEOUT,
    SITE_URL,
)

logger = logging.getLogger(__name__)


def provider_headers() -> dict:
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": APP_TITLE,
    }
    if AI_PROVIDER == "Cloudflare AI Gateway" and CLOUDFLARE_API_TOKEN:
        headers["cf-aig-authorization"] = f"Bearer {CLOUDFLARE_API_TOKEN}"
    return headers


def provider_error_message(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        return f"{AI_ERROR_SOURCE} API error ({exc.response.status_code}): {exc.response.text[:240]}"
    return f"{AI_ERROR_SOURCE} request error: {exc.__class__.__name__}"


async def post_chat_completion(payload: dict) -> dict:
    if not AI_MODELS:
        raise HTTPException(status_code=500, detail=f"{AI_ERROR_SOURCE} model is not configured")

    errors: list[str] = []
    async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT) as client:
        for url in AI_URLS:
            for model in AI_MODELS:
                request_payload = deepcopy(payload)
                request_payload["model"] = model
                try:
                    response = await client.post(url, headers=provider_headers(), json=request_payload)
                    response.raise_for_status()
                    return response.json()
                except Exception as exc:
                    message = provider_error_message(exc)
                    errors.append(f"{model} via {url}: {message}")
                    logger.warning("LLM request failed for model %s via %s: %s", model, url, message)
                    continue

    raise HTTPException(
        status_code=502,
        detail=f"{AI_ERROR_SOURCE} failed for all configured models: {'; '.join(errors)}",
    )
