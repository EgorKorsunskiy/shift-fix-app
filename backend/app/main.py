import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

from app import db
from app.errors import install_error_handlers
from app.routers import shifts, workers

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    conn = db.connect()
    try:
        db.init_db(conn)
    finally:
        conn.close()
    logger.info("Database ready at %s", db.db_path())
    yield


app = FastAPI(title="ShiftFix API", version="0.5.0", lifespan=lifespan)
install_error_handlers(app)
app.include_router(shifts.router, prefix="/api/v1")
app.include_router(workers.router, prefix="/api/v1")


@app.get("/", response_class=HTMLResponse)
def hello() -> str:
    return "<!doctype html><title>ShiftFix</title><h1>Hello, world!</h1>"
