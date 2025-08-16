# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time, logging
import sys
import os
sys.path.append(os.path.dirname(__file__))

from routers.crimes import router as crimes_router
from routers.routes import router as routes_router
#from routers.transit import router as transit_router  # you'll create this

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RouteTO API", description="Toronto routing + crime", version="1.0.0")

# CORS (tighten for prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# Custom logging middleware
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        t0 = time.time()
        logger.info("Request: %s %s", request.method, request.url)
        resp = await call_next(request)
        dt = time.time() - t0
        logger.info("Response: %s (%.3fs)", resp.status_code, dt)
        return resp

app.add_middleware(LoggingMiddleware)

# Health
@app.get("/")
def root():
    return {"message": "RouteTO API is running", "status": "healthy"}

# Mount routers (each already has its own prefix/tags)
app.include_router(crimes_router)
app.include_router(routes_router)
#app.include_router(transit_router)  # TODO: Create transit router

# uvicorn entry (optional if you run with uvicorn CLI)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
