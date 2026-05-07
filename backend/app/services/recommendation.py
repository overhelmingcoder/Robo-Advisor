import asyncio
import json
import os
import re
import time
import logging

import httpx
from fastapi import HTTPException

from app.config import (
    AI_API_KEY,
    AI_ERROR_SOURCE,
    AI_URL,
    CACHE,
    CACHE_TTL,
    FAST_ENRICH,
    FAST_RETURN,
    MODEL,
    OPENROUTER_MAX_ITER,
    OPENROUTER_TEMP,
    OPENROUTER_TIMEOUT,
)
from app.models import UserProfile
from app.tools import TOOLS, dispatch_tool, filter_schemes, score_and_rank_schemes

logger = logging.getLogger(__name__)


def _httpx_error_message(exc: Exception) -> str:
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


async def _post_completion(payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT) as client:
            resp = await client.post(AI_URL, headers=_headers(), json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("LLM request failed: %s", _httpx_error_message(exc))
        _raise_for_request_error(exc)
        raise


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
    }


def _clean_json_text(content: str) -> str:
    return re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`").strip()


def _system_prompt() -> str:
    return (
        "You are an expert Bangladesh financial advisor. "
        "You have access to a comprehensive dataset of 100+ Bangladesh investment schemes (DPS, FDR, Govt bonds, and more). "
        "Use the tools provided to filter and rank schemes for the user, then produce a clear JSON recommendation. "
        "Always call filter_schemes first, then score_and_rank_schemes. "
        "After getting the ranked list, return ONLY a valid JSON object (no markdown, no extra text) with this shape:\n"
        '{"schemes": [{"scheme_id":..., "scheme_name":..., "provider":..., "scheme_type":..., '
        '"risk_level":..., "interest_rate_typical":..., "projected_maturity_value":..., '
        '"total_invested":..., "projected_profit":..., "liquidity":..., "score":..., '
        '"why": "2-3 sentence personalised reason for this user", "notes":...}], '
        '"summary": "3-4 sentence overall portfolio commentary"}'
    )


def _user_message(profile: UserProfile) -> str:
    return (
        f"Please recommend the top 5 investment schemes for this user:\n"
        f"- Monthly income: ৳{profile.monthly_income:,.0f}\n"
        f"- Monthly investment: ৳{profile.monthly_investment:,.0f}\n"
        f"- Investment horizon: {profile.time_range_years} years\n"
        f"- Risk level: {profile.risk_level}\n"
        f"- Target goal: {'৳' + f'{profile.target_goal:,.0f}' if profile.target_goal else 'Not specified'}\n"
        f"\nUse the tools to filter and rank, then return a JSON recommendation."
    )


def _cache_key(profile: UserProfile) -> str:
    return json.dumps(profile.model_dump()) if hasattr(profile, "model_dump") else json.dumps(profile.__dict__)


def _local_fallback(profile: UserProfile) -> dict:
    fs = filter_schemes(profile.risk_level, profile.time_range_years, profile.monthly_investment)
    if fs.get("count", 0) == 0:
        return {"schemes": [], "summary": "No matching schemes (local fast mode)"}
    sr = score_and_rank_schemes(
        scheme_ids=fs.get("matched_scheme_ids", []),
        monthly_investment=profile.monthly_investment,
        time_range_years=profile.time_range_years,
        risk_level=profile.risk_level,
        target_goal=profile.target_goal,
    )
    return {"schemes": sr.get("ranked_schemes", []), "summary": "Local fast response (DEV_FAST_MODE)"}


def _fast_response(profile: UserProfile) -> dict:
    fs = filter_schemes(profile.risk_level, profile.time_range_years, profile.monthly_investment)
    sr_local = score_and_rank_schemes(
        scheme_ids=fs.get("matched_scheme_ids", []),
        monthly_investment=profile.monthly_investment,
        time_range_years=profile.time_range_years,
        risk_level=profile.risk_level,
        target_goal=profile.target_goal,
    )
    return {"schemes": sr_local.get("ranked_schemes", []), "summary": "Fast local recommendations"}


async def _enrich_and_cache(messages: list[dict], cache_key: str):
    try:
        payload = {
            "model": MODEL,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
            "temperature": OPENROUTER_TEMP,
        }
        for _ in range(OPENROUTER_MAX_ITER):
            data = await _post_completion(payload)
            choice = data["choices"][0]
            msg = choice["message"]
            messages.append(msg)

            if choice.get("finish_reason") == "tool_calls" or msg.get("tool_calls"):
                for tc in msg.get("tool_calls", []):
                    tool_name = tc["function"]["name"]
                    tool_args = json.loads(tc["function"]["arguments"])
                    tool_result = dispatch_tool(tool_name, tool_args)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(tool_result),
                    })
                continue

            content = _clean_json_text(msg.get("content", ""))
            try:
                result = json.loads(content)
                CACHE[cache_key] = (int(time.time()), result)
                return
            except Exception:
                return
    except Exception:
        return


async def _run_agentic_recommendation(messages: list[dict], cache_key: str | None = None) -> dict:
    for _ in range(OPENROUTER_MAX_ITER):
        payload = {
            "model": MODEL,
            "messages": messages,
            "tools": TOOLS,
            "tool_choice": "auto",
            "temperature": OPENROUTER_TEMP,
        }
        data = await _post_completion(payload)
        choice = data["choices"][0]
        msg = choice["message"]
        finish = choice.get("finish_reason")

        messages.append(msg)

        if finish == "tool_calls" or (msg.get("tool_calls")):
            for tc in msg.get("tool_calls", []):
                tool_name = tc["function"]["name"]
                tool_args = json.loads(tc["function"]["arguments"])
                tool_result = dispatch_tool(tool_name, tool_args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(tool_result),
                })
            continue

        content = _clean_json_text(msg.get("content", ""))
        try:
            result = json.loads(content)
            if cache_key is not None:
                CACHE[cache_key] = (int(time.time()), result)
            return result
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"Could not parse AI response as JSON: {content[:300]}")
    raise HTTPException(status_code=500, detail="Max tool-call iterations exceeded")


async def recommend_schemes(profile: UserProfile) -> dict:
    cache_key = _cache_key(profile)
    now = int(time.time())
    cached = CACHE.get(cache_key)
    if cached and now - cached[0] < CACHE_TTL:
        return cached[1]

    if not AI_API_KEY:
        if os.getenv("DEV_FAST_MODE", "0") == "1":
            result = _local_fallback(profile)
            CACHE[cache_key] = (now, result)
            return result
        raise HTTPException(status_code=500, detail=f"{AI_ERROR_SOURCE} credentials are not set in .env")

    sys_prompt = _system_prompt()
    user_msg = {"role": "user", "content": _user_message(profile)}

    fast_res = _fast_response(profile)
    if FAST_RETURN:
        CACHE[cache_key] = (now, fast_res)
        if FAST_ENRICH and AI_API_KEY:
            asyncio.create_task(
                _enrich_and_cache(
                    [{"role": "system", "content": sys_prompt}] + [user_msg],
                    cache_key,
                )
            )
        return fast_res

    initial_messages = [
        {"role": "system", "content": sys_prompt},
        user_msg,
    ]
    return await _run_agentic_recommendation(initial_messages, cache_key=None)
