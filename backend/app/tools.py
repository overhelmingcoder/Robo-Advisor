from __future__ import annotations

from typing import Any

from app.data import SCHEMES


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "filter_schemes",
            "description": (
                "Filter investment schemes from the Bangladesh Robo-Advisor dataset based on "
                "the user's risk level, investment duration, and monthly investment amount. "
                "Returns schemes that match the hard-filter criteria."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "risk_level": {
                        "type": "string",
                        "enum": ["Low", "Medium", "High"],
                        "description": "User's risk tolerance level",
                    },
                    "time_range_years": {
                        "type": "number",
                        "description": "Investment duration in years",
                    },
                    "monthly_investment": {
                        "type": "number",
                        "description": "Monthly investment amount in BDT",
                    },
                },
                "required": ["risk_level", "time_range_years", "monthly_investment"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "score_and_rank_schemes",
            "description": (
                "Score and rank a list of filtered schemes using the decision-engine rules: "
                "interest rate (40%), duration match (25%), provider trust (15%), goal coverage (20%), "
                "plus liquidity bonus. Returns top 5 schemes with scores and projected returns."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "scheme_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of scheme_id values to score",
                    },
                    "monthly_investment": {"type": "number"},
                    "time_range_years": {"type": "number"},
                    "risk_level": {"type": "string"},
                    "target_goal": {
                        "type": "number",
                        "description": "Optional target corpus in BDT",
                    },
                },
                "required": ["scheme_ids", "monthly_investment", "time_range_years", "risk_level"],
            },
        },
    },
]


def filter_schemes(risk_level: str, time_range_years: float, monthly_investment: float) -> dict:
    matched = []
    for s in SCHEMES:
        # R-01: risk match
        if s["risk_level"].lower() != risk_level.lower():
            continue
        # R-02: duration fit
        d_min = s["duration_min"]
        d_max = s["duration_max"]
        try:
            d_min = float(d_min) if d_min is not None else 0.0
        except Exception:
            d_min = 0.0
        try:
            d_max = float(d_max) if d_max is not None else 9999.0
        except Exception:
            d_max = 9999.0
        if not (d_min <= time_range_years <= d_max):
            # Savings / liquid accounts with no max → always pass
            if s["scheme_type"] not in ("Savings", "MFS Savings"):
                continue
        # R-03: monthly minimum
        min_inv = s["min_monthly_invest"]
        if min_inv is not None:
            try:
                if monthly_investment < float(min_inv):
                    continue
            except Exception:
                pass
        matched.append(s["scheme_id"])
    return {"matched_scheme_ids": matched, "count": len(matched)}


def score_and_rank_schemes(
    scheme_ids: list[str],
    monthly_investment: float,
    time_range_years: float,
    risk_level: str,
    target_goal: float | None = None,
) -> dict:
    pool = [s for s in SCHEMES if s["scheme_id"] in scheme_ids]
    if not pool:
        return {"ranked_schemes": []}

    rates = [s["interest_rate_typical"] for s in pool if s["interest_rate_typical"] is not None]
    min_rate = min(rates) if rates else 0
    max_rate = max(rates) if rates else 1

    scored = []
    for s in pool:
        rate = s["interest_rate_typical"] or 0
        # R-04 interest score 40%
        rate_score = ((rate - min_rate) / (max_rate - min_rate)) * 40 if max_rate != min_rate else 20

        # R-05 duration match 25%
        try:
            d_min = float(s["duration_min"] or 0)
        except Exception:
            d_min = 0
        try:
            d_max_raw = s["duration_max"]
            d_max = float(d_max_raw) if d_max_raw is not None else time_range_years
        except Exception:
            d_max = time_range_years
        optimal = (d_min + d_max) / 2
        max_dur = max(d_max, time_range_years, 1)
        dur_score = (1 - abs(optimal - time_range_years) / max_dur) * 25

        # R-06 provider trust 15%
        trust_score = 0
        if risk_level == "Low" and s["provider_type"] in ("Government", "NSD / Bangladesh Govt", "Bangladesh Govt (BB)"):
            trust_score = 15
        elif s["provider_type"] in ("Government", "NSD / Bangladesh Govt"):
            trust_score = 10
        else:
            trust_score = 8

        # R-07 goal coverage 20%
        goal_score = 0
        if target_goal and target_goal > 0:
            # Simple FV estimate
            monthly_rate = rate / 100 / 12
            n = int(time_range_years * 12)
            if monthly_rate > 0:
                fv = monthly_investment * ((1 + monthly_rate) ** n - 1) / monthly_rate
            else:
                fv = monthly_investment * n
            if fv >= target_goal:
                goal_score = 20
            elif fv >= 0.8 * target_goal:
                goal_score = 10
        else:
            goal_score = 10  # neutral

        # R-08 liquidity bonus
        liquidity_bonus = 5 if s.get("liquidity") == "High" else 0

        total = rate_score + dur_score + trust_score + goal_score + liquidity_bonus

        # Projected maturity value
        monthly_rate = rate / 100 / 12
        n = int(time_range_years * 12)
        if monthly_rate > 0 and n > 0:
            fv = monthly_investment * ((1 + monthly_rate) ** n - 1) / monthly_rate
        else:
            fv = monthly_investment * n
        total_invested = monthly_investment * n

        scored.append({
            **s,
            "score": round(total, 2),
            "projected_maturity_value": round(fv),
            "total_invested": round(total_invested),
            "projected_profit": round(fv - total_invested),
        })

    scored.sort(key=lambda x: (-x["score"], -(x["interest_rate_typical"] or 0)))
    return {"ranked_schemes": scored[:5]}


def dispatch_tool(name: str, args: dict) -> Any:
    if name == "filter_schemes":
        return filter_schemes(**args)
    elif name == "score_and_rank_schemes":
        return score_and_rank_schemes(**args)
    raise ValueError(f"Unknown tool: {name}")

