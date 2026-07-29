import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

# 加载 backend/.env（DeepSeek API Key 等），不覆盖已有环境变量
load_dotenv(Path(__file__).resolve().parent / ".env")

from db import init_db
from routers.api import limiter, router
from routers.auth import router as auth_router
from routers.billing import router as billing_router
from routers.summarize import router as summarize_router
from services.ytdlp import job_store

logging.basicConfig(level=os.environ.get("LOGLEVEL", "INFO"))
logger = logging.getLogger(__name__)

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

app = FastAPI(title="VideoGrab API", version="1.0.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "解析请求过于频繁，请稍后再试"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(summarize_router)
app.include_router(auth_router)
app.include_router(billing_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


async def cleanup_loop():
    while True:
        await asyncio.sleep(900)
        count = job_store.cleanup_expired()
        if count:
            logger.info("Cleaned up %d expired jobs", count)


@app.on_event("startup")
async def startup():
    init_db()
    logger.info("SQLite ready")
    asyncio.create_task(cleanup_loop())
