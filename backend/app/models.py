from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    monthly_income: float
    monthly_investment: float
    time_range_years: float
    risk_level: str  # "Low" | "Medium" | "High"
    target_goal: float | None = None


class RecommendationRequest(BaseModel):
    profile: UserProfile


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    scheme_id: str
    question: str
    profile: UserProfile | None = None
    history: list[ChatMessage] = Field(default_factory=list)

