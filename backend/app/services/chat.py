import json
import os
import re
import logging

import httpx
from fastapi import HTTPException

from app.config import AI_API_KEY, AI_ERROR_SOURCE, AI_URL, MODEL, OPENROUTER_TEMP, OPENROUTER_TIMEOUT
from app.data import find_scheme
from app.models import ChatRequest
from app.utils import format_profile_line

logger = logging.getLogger(__name__)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
    }


def _clean_json_text(content: str) -> str:
    return re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`").strip()


def _scheme_context(scheme: dict) -> str:
    return json.dumps({
        "scheme_id": scheme["scheme_id"],
        "scheme_name": scheme["scheme_name"],
        "provider": scheme["provider"],
        "scheme_type": scheme["scheme_type"],
        "risk_level": scheme["risk_level"],
        "interest_rate_typical": scheme["interest_rate_typical"],
        "duration_min": scheme.get("duration_min"),
        "duration_max": scheme.get("duration_max"),
        "liquidity": scheme.get("liquidity"),
        "min_monthly_invest": scheme.get("min_monthly_invest"),
        "notes": scheme.get("notes"),
        "projected_maturity_value": scheme.get("projected_maturity_value"),
    }, ensure_ascii=False)


def _system_prompt() -> str:
    return (
        "You are a senior Bangladesh financial advisor assistant. "
        "Stay strictly within the selected scheme context. "
        "If the user asks anything unrelated, redirect briefly back to the selected scheme context. "
        "Use only the scheme and profile details provided below. "
        "Return ONLY valid JSON with this exact shape: "
        "{"
        '"recommendation_summary":"2-3 professional sentences personalized to the user question",'
        '"highlights":{"risk_level":"Low|Medium|High or N/A","expected_return":"string","duration":"string","liquidity":"string","best_option":"string"},'
        '"comparison_table":{"columns":["Metric","Selected Scheme","Advisor View"],"rows":[["Risk","Low","Suitable for conservative investors"]]},'
        '"risk_analysis":["bullet point 1","bullet point 2"],'
        '"why_this_fits_user":["bullet point 1","bullet point 2"],'
        '"final_suggestion":"clear practical closing recommendation",'
        '"markdown":"optional concise markdown version using headings and bullets"'
        "}. "
        "Always include the sections Recommendation Summary, Comparison Table, Risk Analysis, "
        "Why This Fits the User, and Final Suggestion through those JSON fields. "
        "Use a professional fintech advisor tone. Keep emojis minimal."
    )


def _structured_fallback(content: str, scheme: dict | None = None) -> dict:
    highlights = {
        "risk_level": scheme.get("risk_level", "N/A") if scheme else "N/A",
        "expected_return": (
            f"{scheme.get('interest_rate_typical')}%" if scheme and scheme.get("interest_rate_typical") is not None else "N/A"
        ),
        "duration": (
            f"{scheme.get('duration_min', 0)}-{scheme.get('duration_max') or 'flexible'} years" if scheme else "N/A"
        ),
        "liquidity": scheme.get("liquidity", "N/A") if scheme else "N/A",
        "best_option": scheme.get("scheme_name", "Selected scheme") if scheme else "Selected scheme",
    }
    return {
        "recommendation_summary": content,
        "highlights": highlights,
        "comparison_table": {
            "columns": ["Metric", "Selected Scheme", "Advisor View"],
            "rows": [
                ["Risk", highlights["risk_level"], "Review against your risk tolerance."],
                ["Expected return", highlights["expected_return"], "Estimated annual return from the dataset."],
                ["Duration", highlights["duration"], "Match this with your investment horizon."],
                ["Liquidity", highlights["liquidity"], "Check how quickly funds can be accessed."],
            ],
        },
        "risk_analysis": ["Review lock-in, liquidity, and provider terms before investing."],
        "why_this_fits_user": ["This response is based on the selected scheme and your submitted profile."],
        "final_suggestion": "Use this as a screening recommendation and verify current rates before investing.",
        "markdown": content,
    }


def _normalize_structured_response(parsed: dict, scheme: dict) -> dict:
    fallback = _structured_fallback("", scheme)
    result = {
        "recommendation_summary": parsed.get("recommendation_summary") or parsed.get("summary") or fallback["recommendation_summary"],
        "highlights": {**fallback["highlights"], **(parsed.get("highlights") or {})},
        "comparison_table": parsed.get("comparison_table") or fallback["comparison_table"],
        "risk_analysis": parsed.get("risk_analysis") or fallback["risk_analysis"],
        "why_this_fits_user": parsed.get("why_this_fits_user") or parsed.get("fit_analysis") or fallback["why_this_fits_user"],
        "final_suggestion": parsed.get("final_suggestion") or parsed.get("recommendation") or fallback["final_suggestion"],
        "markdown": parsed.get("markdown") or "",
    }
    table = result.get("comparison_table") or {}
    if not isinstance(table, dict) or not table.get("columns") or not table.get("rows"):
        result["comparison_table"] = fallback["comparison_table"]
    for key in ("risk_analysis", "why_this_fits_user"):
        if isinstance(result[key], str):
            result[key] = [result[key]]
    return result


def _parse_llm_response(payload: dict, scheme: dict) -> dict:
    data = payload
    try:
        msg = data["choices"][0]["message"]
    except (KeyError, TypeError, IndexError):
        raise HTTPException(status_code=502, detail=f"{AI_ERROR_SOURCE} returned unexpected payload shape")

    content = _clean_json_text(msg.get("content", ""))
    if not content:
        raise HTTPException(status_code=502, detail="Could not parse AI chat response")
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return _structured_fallback(content, scheme)
    if not isinstance(parsed, dict):
        return _structured_fallback(content, scheme)
    return _normalize_structured_response(parsed, scheme)


def _httpx_error_message(exc: Exception) -> str:
    # Keep this short for clients and avoid leaking internals.
    return f"{AI_ERROR_SOURCE} request error: {exc.__class__.__name__}"


def _raise_for_request_error(payload_exc: Exception) -> None:
    if isinstance(payload_exc, httpx.HTTPStatusError):
        status = payload_exc.response.status_code
        body = payload_exc.response.text[:800]
        if status == 429:
            raise HTTPException(status_code=429, detail=f"{AI_ERROR_SOURCE} rate limit exceeded: {body}")
        raise HTTPException(status_code=502, detail=f"{AI_ERROR_SOURCE} API error ({status}): {body}")
    if isinstance(payload_exc, httpx.TimeoutException):
        raise HTTPException(status_code=504, detail=f"{AI_ERROR_SOURCE} timed out after {OPENROUTER_TIMEOUT}s")
    if isinstance(payload_exc, httpx.RequestError):
        raise HTTPException(status_code=502, detail=_httpx_error_message(payload_exc))
    raise HTTPException(status_code=502, detail=_httpx_error_message(payload_exc))


async def _post_chat(payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT) as client:
            response = await client.post(AI_URL, headers=_headers(), json=payload)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning("LLM request failed: %s", _httpx_error_message(exc))
        _raise_for_request_error(exc)
        raise


async def chat_about_scheme(request: ChatRequest) -> dict:
    scheme = find_scheme(request.scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    if not AI_API_KEY:
        if os.getenv("DEV_FAST_MODE", "0") == "1":
            return {
                "reply": _structured_fallback(
                    (
                        f"{scheme['scheme_name']} is a {scheme['scheme_type']} product from {scheme['provider']}. "
                        f"It has a {scheme['risk_level']} risk profile and should be reviewed against your horizon, "
                        "liquidity needs, and current market rates."
                    ),
                    scheme,
                )
            }
        raise HTTPException(status_code=500, detail=f"{AI_ERROR_SOURCE} credentials are not set in .env")

    scheme_context = _scheme_context(scheme)
    profile_text = format_profile_line(request.profile)
    history_messages = [m.model_dump() for m in request.history if m.role in {"user", "assistant"}]

    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "system", "content": f"Selected scheme context (must always be followed):\n{scheme_context}"},
        {"role": "system", "content": f"User profile context:\n{profile_text}"},
    ]
    messages.extend(history_messages)
    if not history_messages or history_messages[-1].get("content") != request.question:
        messages.append({"role": "user", "content": request.question})

    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": OPENROUTER_TEMP,
    }
    data = await _post_chat(payload)
    content = _parse_llm_response(data, scheme)
    if not content:
        raise HTTPException(status_code=502, detail="Could not parse AI chat response")
    return {"reply": content}
