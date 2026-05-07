from fastapi import APIRouter

from app.models import ChatRequest
from app.services.chat import chat_about_scheme

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    return await chat_about_scheme(request)

