"""
TexGauge IQ - Backend Entry Point
==================================
FastAPI application for industrial scale communication.
Provides REST APIs and WebSocket for real-time weight data.
"""

import asyncio
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.api.routes import router, serial_service, ws_manager, diagnostics_service
from backend.config import config
from backend.services.serial_service import SerialScaleService
from backend.services.diagnostics import DiagnosticsService
from backend.websocket.manager import WebSocketManager
from backend.utils.logger import get_logger

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    logger.info("=" * 50)
    logger.info("TexGauge IQ Backend Starting...")
    logger.info("=" * 50)

    # Initialize services
    app.state.serial_service = SerialScaleService()
    app.state.ws_manager = WebSocketManager()
    app.state.diagnostics = DiagnosticsService(
        serial_service=app.state.serial_service,
        websocket_manager=app.state.ws_manager,
    )

    # Wire up services
    app.state.ws_manager.set_serial_service(app.state.serial_service)

    # Set globals in routes module (for dependency injection)
    import backend.api.routes as routes
    routes.serial_service = app.state.serial_service
    routes.ws_manager = app.state.ws_manager
    routes.diagnostics_service = app.state.diagnostics

    # Start WebSocket broadcast loop
    await app.state.ws_manager.start_broadcast_loop()

    # Register serial callbacks
    app.state.serial_service.on_weight(
        lambda r: asyncio.ensure_future(app.state.ws_manager.broadcast_weight(r))
    )
    app.state.serial_service.on_status_change(
        lambda s: asyncio.ensure_future(app.state.ws_manager.broadcast_status(s))
    )

    logger.info(f"Server configured: {config.get('server.host')}:{config.get('server.port')}")
    logger.info("TexGauge IQ Backend Started Successfully")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("=" * 50)
    logger.info("TexGauge IQ Backend Shutting Down...")
    logger.info("=" * 50)

    if hasattr(app.state, "serial_service"):
        await app.state.serial_service.cleanup()
    if hasattr(app.state, "ws_manager"):
        await app.state.ws_manager.cleanup()

    logger.info("TexGauge IQ Backend Shutdown Complete")
    logger.info("=" * 50)


# Create FastAPI app
app = FastAPI(
    title="TexGauge IQ - Industrial Scale Backend",
    description="Backend API for industrial scale communication in textile quality monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get("server.cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

# Mount static frontend files
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/pages", StaticFiles(directory="pages"), name="pages")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - serve the main frontend page."""
    return FileResponse("index.html")

# Serve frontend HTML files (non-API, non-static paths)
@app.api_route("/{full_path:path}", methods=["GET"])
async def serve_frontend(full_path: str):
    # Don't interfere with API routes
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi"):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    
    from pathlib import Path
    
    # Serve login.html
    if full_path == "login.html":
        return FileResponse("login.html")
    
    # Serve page HTML files
    p = Path(f"pages/{full_path}")
    if p.suffix == ".html" and p.exists():
        return FileResponse(str(p))
    
    # Serve style.css
    if full_path == "style.css":
        return FileResponse("style.css")
    
    # Fallback to index.html
    return FileResponse("index.html")


def run():
    """Run the FastAPI application with uvicorn."""
    import uvicorn

    host = config.get("server.host", "0.0.0.0")
    port = config.get("server.port", 8000)
    reload = config.get("server.reload", False)

    logger.info(f"Starting uvicorn server on {host}:{port} (reload={reload})")
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
    )


if __name__ == "__main__":
    run()