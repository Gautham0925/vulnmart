from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import seed
from app.core.config import get_settings
from app.core.mode import current_mode
from app.routers import admin, auth, labs, legacy, orders, products, reviews, seller, users

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed.run()
    yield


app = FastAPI(
    title="VulnMarket API",
    version="1.0.0",
    description="Intentionally vulnerable e-commerce training API. Local training use only.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def mode_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-VulnMarket-Mode"] = current_mode()
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


for module in (auth, users, products, orders, reviews, seller, admin, labs, legacy):
    app.include_router(module.router)
