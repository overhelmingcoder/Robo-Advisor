def format_profile_line(profile) -> str:
    if not profile:
        return "No user profile was provided."
    return (
        f"Monthly income: ৳{profile.monthly_income:,.0f}\n"
        f"Monthly investment: ৳{profile.monthly_investment:,.0f}\n"
        f"Investment horizon: {profile.time_range_years} years\n"
        f"Risk tolerance: {profile.risk_level}\n"
        f"Target goal: {'৳' + f'{profile.target_goal:,.0f}' if profile.target_goal else 'Not specified'}\n"
    )

