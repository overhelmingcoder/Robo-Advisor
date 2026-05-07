from fastapi import APIRouter

from app.models import RecommendationRequest
from app.services.recommendation import recommend_schemes

router = APIRouter()


@router.post("/recommend")
async def recommend(request: RecommendationRequest):
    return await recommend_schemes(request.profile)

