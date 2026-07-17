from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import auth, records, master, search, audit, retention, import_records, ediscovery, reports, admin, schedules, copilot, dco, harmonization, warehouse, compliance
from .scheduler import setup_scheduler
import logging
import traceback
import os
import time

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_api_call(message):
    try:
        log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "passenger_debug.log")
        with open(log_path, "a") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}\n")
    except Exception:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Unhandled Exception on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}"
    try:
        log_api_call(error_msg)
    except Exception:
        pass
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error", 
            "error": str(exc), 
            "traceback": traceback.format_exc().splitlines()
        }
    )


@app.on_event("startup")
async def startup_event():
    if settings.RUN_SCHEDULER:
        setup_scheduler(app)
        logger.info("Background scheduler initialized and started.")
    else:
        logger.info("Background scheduler is disabled.")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for deployment testing, can be restricted later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(records.router, prefix=f"{settings.API_V1_STR}/records", tags=["records"])
app.include_router(master.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(retention.router, prefix=settings.API_V1_STR)
app.include_router(import_records.router, prefix=settings.API_V1_STR)
app.include_router(ediscovery.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(schedules.router, prefix=settings.API_V1_STR)
app.include_router(copilot.router, prefix=settings.API_V1_STR)
app.include_router(dco.router, prefix=settings.API_V1_STR)
app.include_router(harmonization.router, prefix=settings.API_V1_STR)
app.include_router(warehouse.router, prefix=settings.API_V1_STR)
app.include_router(compliance.router, prefix=settings.API_V1_STR)




@app.get("/")
async def root():
    log_api_call("GET / requested")
    return {"message": "Welcome to SpiderSmart IMS API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    log_api_call("GET /health requested")
    return {"status": "healthy"}

@app.get(f"{settings.API_V1_STR}/health")
async def health_check_v1():
    log_api_call("GET /api/v1/health requested")
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


