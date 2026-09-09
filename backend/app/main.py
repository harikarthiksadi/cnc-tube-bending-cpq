from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import APP_NAME
from app.core.database import init_db
from app.api import cad, pricing, quotes, admin, sketch

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database & default seed rates on startup
    await init_db()
    yield

app = FastAPI(
    title=APP_NAME,
    description="Automated CNC Tube Bending CPQ & CAD Geometry Pricing Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cad.router)
app.include_router(sketch.router)
app.include_router(pricing.router)
app.include_router(quotes.router)
app.include_router(admin.router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

# Mount frontend dist static files if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith("api/"):
            return None
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def health_check():
        return {
            "status": "online",
            "app": APP_NAME,
            "engine": "CNC Tube Bending CPQ v1.0",
            "docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
