import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routers import upload, dataset, config, connect
from backend.routers import anomaly, transform, columns, clean

app = FastAPI(title="Renvo AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(dataset.router, prefix="/api", tags=["dataset"])
app.include_router(config.router, prefix="/api", tags=["config"])
app.include_router(connect.router, prefix="/api", tags=["connect"])
app.include_router(anomaly.router, prefix="/api", tags=["anomaly"])
app.include_router(transform.router, prefix="/api", tags=["transform"])
app.include_router(columns.router, prefix="/api", tags=["columns"])
app.include_router(clean.router, prefix="/api", tags=["clean"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Renvo AI"}


# Serve React static files — must be after all API routes
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

if os.path.isdir(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
