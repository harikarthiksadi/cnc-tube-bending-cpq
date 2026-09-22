import sys
from pathlib import Path

# Ensure backend root is on sys.path so 'import app.xxx' works from any working directory (e.g. Vercel)
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

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

from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(cad.router)
app.include_router(sketch.router)
app.include_router(pricing.router)
app.include_router(quotes.router)
app.include_router(admin.router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi import HTTPException
from pathlib import Path

# Mount frontend dist or static directory
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
STATIC_DIST = Path(__file__).resolve().parent / "static"

dist_dir = None
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    dist_dir = FRONTEND_DIST
elif STATIC_DIST.exists() and (STATIC_DIST / "index.html").exists():
    dist_dir = STATIC_DIST

if dist_dir:
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    static_img_dir = dist_dir / "static"
    if static_img_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_img_dir)), name="static_img")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_frontend(full_path: str):
        # Allow API routes to be handled by routers
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = dist_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/", response_class=HTMLResponse)
    def health_check():
        return f"""
        <!doctype html>
        <html>
        <head><title>{APP_NAME} - Backend Active</title>
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
          .card {{ background: #1e293b; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); max-width: 500px; text-align: center; border: 1px solid #334155; }}
          h1 {{ font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }}
          p {{ color: #94a3b8; line-height: 1.6; font-size: 0.95rem; }}
          .badge {{ display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; margin-bottom: 1rem; }}
          .btn {{ display: inline-block; background: #38bdf8; color: #0f172a; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; margin-top: 1rem; }}
        </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">API Engine Active</span>
            <h1>{APP_NAME}</h1>
            <p>FastAPI Backend is running on port 8000.</p>
            <p>To view the full React web application, either build it once with <code>cd frontend && npm run build</code> or start the dev server with <code>cd frontend && npm run dev</code>.</p>
            <a class="btn" href="/docs">Open Interactive API Docs</a>
          </div>
        </body>
        </html>
        """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
