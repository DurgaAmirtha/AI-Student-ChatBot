import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import engine, Base
from backend.routes import auth, chat, planner, files

# Initialize DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Student Super Assistant")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(planner.router_planner, prefix="/api/planner", tags=["planner"])
app.include_router(planner.router_analytics, prefix="/api/analytics", tags=["analytics"])
app.include_router(files.router, prefix="/api/files", tags=["files"])

# Frontend routes configuration
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "templates", "index.html"))

    @app.get("/app")
    async def serve_app():
        return FileResponse(os.path.join(FRONTEND_DIR, "templates", "app.html"))
