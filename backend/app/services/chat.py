import json
import re
import logging

from fastapi import HTTPException

from app.config import (
    AI_API_KEY,
    AI_ERROR_SOURCE,
    CHAT_MAX_TOKENS,
    MODEL,
    OPENROUTER_TEMP,
)
from app.data import find_scheme
from app.models import ChatRequest
from app.services.ai_client import post_chat_completion
from app.tools import score_and_rank_schemes
from app.utils import format_profile_line

logger = logging.getLogger(__name__)


def _clean_json_text(content: str) -> str:
    return re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`").strip()


def _scheme_context(scheme: dict, profile=None) -> str:
    projected = {}
    if profile:
        ranked = score_and_rank_schemes(
            scheme_ids=[scheme["scheme_id"]],
            monthly_investment=profile.monthly_investment,
            time_range_years=profile.time_range_years,
            risk_level=profile.risk_level,
            target_goal=profile.target_goal,
        ).get("ranked_schemes", [])
        if ranked:
            projected = {
                "projected_maturity_value": ranked[0].get("projected_maturity_value"),
                "total_invested": ranked[0].get("total_invested"),
                "projected_profit": ranked[0].get("projected_profit"),
                "goal_gap": (
                    round((profile.target_goal or 0) - ranked[0].get("projected_maturity_value", 0))
                    if profile.target_goal else None
                ),
                "goal_met": (
                    ranked[0].get("projected_maturity_value", 0) >= profile.target_goal
                    if profile.target_goal else None
                ),
            }

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
        **projected,
    }, ensure_ascii=False)


def _system_prompt() -> str:
    return (
        "You are a Bangladesh investment assistant inside a scheme-specific chat. "
        "Answer only the user's latest question using the selected scheme and user profile. "
        "Do not repeat a fixed report template. Do not include generic sections like Recommendation Summary, "
        "Comparison Table, Risk Analysis, Why This Fits, or Final Suggestion unless the user explicitly asks for that format. "
        "For simple questions, answer in 2-4 short sentences. For risk/comparison questions, use up to 4 bullets. "
        "Use a table only when the user explicitly asks to compare. "
        "If the user asks whether the scheme matches their goal, directly compare projected maturity value, total investment, "
        "monthly investment, horizon, and target goal when those values are available. "
        "If the answer is not available in the provided context, say what is missing and suggest what to verify. "
        "Return ONLY valid JSON with this shape: {\"markdown\":\"concise markdown answer\"}."
    )


def _markdown_reply(content: str) -> dict:
    return {"markdown": content.strip()}


def _provider_fallback(scheme: dict) -> dict:
    content = (
        f"{scheme['scheme_name']} is a {scheme['scheme_type']} product from {scheme['provider']}. "
        f"It has a {scheme['risk_level']} risk profile, a typical return of "
        f"{scheme.get('interest_rate_typical', 'N/A')}%, and "
        f"{scheme.get('liquidity', 'N/A')} liquidity. "
        "The live AI advisor is temporarily unavailable, so this response uses the local scheme data."
    )
    return _markdown_reply(content)


def _normalize_structured_response(parsed: dict, scheme: dict) -> dict:
    markdown = parsed.get("markdown") or parsed.get("answer") or parsed.get("reply")
    if markdown:
        return _markdown_reply(str(markdown))

    chunks = [
        parsed.get("recommendation_summary") or parsed.get("summary"),
        parsed.get("final_suggestion") or parsed.get("recommendation"),
    ]
    return _markdown_reply("\n\n".join(str(chunk) for chunk in chunks if chunk))


def _parse_llm_response(payload: dict, scheme: dict) -> dict:
    data = payload
    try:
        msg = data["choices"][0]["message"]
    except (KeyError, TypeError, IndexError):
        raise HTTPException(status_code=502, detail=f"{AI_ERROR_SOURCE} returned unexpected payload shape")

    content = _clean_json_text(msg.get("content") or "")
    if not content:
        raise HTTPException(status_code=502, detail="Could not parse AI chat response")
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return _markdown_reply(content)
    if not isinstance(parsed, dict):
        return _markdown_reply(content)
    return _normalize_structured_response(parsed, scheme)


def _recent_user_context(history: list) -> list[dict]:
    user_messages = [
        m.content.strip()
        for m in history
        if m.role == "user" and m.content and m.content.strip()
    ][-3:]
    if not user_messages:
        return []
    return [{
        "role": "system",
        "content": "Recent user questions for context only; answer the latest question below:\n"
        + "\n".join(f"- {message}" for message in user_messages),
    }]


async def chat_about_scheme(request: ChatRequest) -> dict:
    scheme = find_scheme(request.scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")

    if not AI_API_KEY:
        logger.warning("%s credentials are not configured; returning local chat fallback", AI_ERROR_SOURCE)
        return {"reply": _provider_fallback(scheme)}

    scheme_context = _scheme_context(scheme, request.profile)
    profile_text = format_profile_line(request.profile)
    latest_question = request.question.strip()

    messages = [
        {"role": "system", "content": _system_prompt()},
        {"role": "system", "content": f"Selected scheme context (must always be followed):\n{scheme_context}"},
        {"role": "system", "content": f"User profile context:\n{profile_text}"},
        *_recent_user_context(request.history),
        {"role": "user", "content": latest_question},
    ]

    payload = {
        "model": MODEL,
        "messages": messages,
        "max_tokens": CHAT_MAX_TOKENS,
        "temperature": OPENROUTER_TEMP,
    }
    try:
        data = await post_chat_completion(payload)
    except HTTPException as exc:
        logger.warning("%s chat failed; returning local fallback: %s", AI_ERROR_SOURCE, exc.detail)
        return {"reply": _provider_fallback(scheme)}
    try:
        content = _parse_llm_response(data, scheme)
    except HTTPException as exc:
        logger.warning("%s chat parse failed; returning local fallback: %s", AI_ERROR_SOURCE, exc.detail)
        return {"reply": _provider_fallback(scheme)}
    if not content:
        raise HTTPException(status_code=502, detail="Could not parse AI chat response")
    return {"reply": content}
