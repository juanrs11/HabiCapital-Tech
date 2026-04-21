from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import accounts, auth, groups, payment_links, recurring, transfers

app = FastAPI(title="HabiPay API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
async def api_health() -> dict[str, str]:
    return {"status": "ok"}


for router in [auth.router, accounts.router, transfers.router, groups.router, recurring.router, payment_links.router]:
    app.include_router(router)
    app.include_router(router, prefix="/api")
