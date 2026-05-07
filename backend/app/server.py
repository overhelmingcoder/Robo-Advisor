from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.recommend import router as recommend_router
from app.api.schemes import router as schemes_router
from app.config import ALLOWED_ORIGINS, AI_PROVIDER, AI_URL
import logging


app = FastAPI(title="Bangladesh Robo-Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend_router)
app.include_router(chat_router)
app.include_router(schemes_router)

logging.getLogger("uvicorn.error").info(
    "LLM provider initialized: %s (%s)",
    AI_PROVIDER,
    AI_URL,
)
