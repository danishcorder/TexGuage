"""
TexGauge IQ - REST API Routes
==============================
All REST API endpoints for scale management, configuration,
diagnostics, and system control.
"""

import asyncio
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from backend.config import config
from backend.models.schemas import (
    ConfigUpdateRequest,
    ConnectRequest,
    DiagnosticsResponse,
    HealthResponse,
    LogEntry,
    PortInfo,
    PortScanResult,
    ScaleCommandResponse,
    ScaleStatus,
    TareResponse,
    WeightReading,
)
from backend.services.serial_service import SerialScaleService
from backend.services.diagnostics import DiagnosticsService
from backend.websocket.manager import WebSocketManager
from backend.utils.logger import get_logger

logger = get_logger("api")

router = APIRouter(prefix="/api", tags=["Scale API"])

# Global service instances (set by main.py)
serial_service: Optional[SerialScaleService] = None
ws_manager: Optional[WebSocketManager] = None
diagnostics_service: Optional[DiagnosticsService] = None


def get_serial() -> SerialScaleService:
    """Dependency: get serial service instance."""
    if serial_service is None:
        raise HTTPException(status_code=503, detail="Serial service not initialized")
    return serial_service


def get_ws() -> WebSocketManager:
    """Dependency: get WebSocket manager instance."""
    if ws_manager is None:
        raise HTTPException(status_code=503, detail="WebSocket manager not initialized")
    return ws_manager


def get_diagnostics() -> DiagnosticsService:
    """Dependency: get diagnostics service instance."""
    if diagnostics_service is None:
        raise HTTPException(status_code=503, detail="Diagnostics service not initialized")
    return diagnostics_service


# ==================== HEALTH & STATUS ====================


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Backend health check endpoint."""
    svc = get_serial()
    ws = get_ws()
    status = svc.get_status()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        uptime=diagnostics_service.get_uptime() if diagnostics_service else 0.0,
        scale_connected=status.connected,
        websocket_clients=ws.client_count(),
        timestamp=datetime.now().isoformat(),
    )


@router.get("/status", response_model=ScaleStatus)
async def get_scale_status():
    """Get current scale connection status."""
    svc = get_serial()
    return svc.get_status()


# ==================== PORT MANAGEMENT ====================


@router.get("/ports", response_model=PortScanResult)
async def list_ports():
    """List all available COM ports."""
    svc = get_serial()
    ports = await svc.scan_ports()
    return PortScanResult(
        ports=ports,
        count=len(ports),
        success=True,
        message=f"Found {len(ports)} port(s)",
    )


@router.post("/scan", response_model=PortScanResult)
async def scan_ports():
    """Scan for available COM ports."""
    svc = get_serial()
    ports = await svc.scan_ports()
    return PortScanResult(
        ports=ports,
        count=len(ports),
        success=True,
        message=f"Found {len(ports)} port(s)",
    )


# ==================== CONNECTION ====================


@router.post("/connect", response_model=ScaleCommandResponse)
async def connect_scale(request: ConnectRequest = None):
    """Connect to a scale. Auto-detects port and baud rate if not specified."""
    svc = get_serial()
    if request is None:
        request = ConnectRequest(auto_detect=True)
    result = await svc.connect(port=request.port, baud_rate=request.baud_rate)
    return result


@router.post("/disconnect", response_model=ScaleCommandResponse)
async def disconnect_scale():
    """Disconnect from the scale."""
    svc = get_serial()
    return await svc.disconnect()


# ==================== WEIGHT DATA ====================


@router.get("/weight", response_model=WeightReading)
async def get_weight():
    """Get the current weight reading from the scale."""
    svc = get_serial()
    return svc.get_last_reading()


# ==================== SCALE COMMANDS ====================


@router.post("/tare", response_model=TareResponse)
async def tare_scale():
    """Tare (zero) the scale."""
    svc = get_serial()
    return await svc.tare()


@router.post("/zero", response_model=TareResponse)
async def zero_scale():
    """Zero the scale (same as tare)."""
    svc = get_serial()
    return await svc.zero()


@router.post("/restart", response_model=ScaleCommandResponse)
async def restart_scale():
    """Restart the scale connection."""
    svc = get_serial()
    return await svc.restart()


# ==================== DIAGNOSTICS ====================


@router.get("/diagnostics")
async def get_diagnostics():
    """Get comprehensive system diagnostics."""
    try:
        diag = get_diagnostics()
        result = await diag.get_diagnostics()
        return result
    except Exception as e:
        logger.error(f"Diagnostics error: {e}")
        from backend.models.schemas import DiagnosticsResponse
        return DiagnosticsResponse(
            python_version="",
            os="",
            os_version="",
            hostname="",
            backend_uptime=0.0,
            cpu_percent=0.0,
            memory_percent=0.0,
            memory_used_mb=0.0,
            available_ports=[],
            connected_device=None,
            config={},
            websocket_clients=0,
        )


# ==================== CONFIGURATION ====================


@router.get("/config")
async def get_config():
    """Get current configuration."""
    return config.get_all()


@router.post("/config")
async def update_config(update: ConfigUpdateRequest):
    """Update configuration values."""
    try:
        config.update(update.updates)
        logger.info(f"Configuration updated: {update.updates}")
        return {"success": True, "message": "Configuration updated", "config": config.get_all()}
    except Exception as e:
        logger.error(f"Config update error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== LOGS ====================


@router.get("/logs", response_model=List[LogEntry])
async def get_logs(lines: int = Query(100, ge=10, le=1000)):
    """Get recent log entries."""
    from backend.utils.logger import get_logger

    log = get_logger()
    return log.get_recent_logs(lines=lines)


# ==================== WEBSOCKET ====================


@router.websocket("/ws/weight")
async def websocket_weight(websocket: WebSocket):
    """
    WebSocket endpoint for real-time weight data.
    Clients receive:
    - weight: Current weight reading
    - status: Scale connection status
    - heartbeat: Periodic keepalive
    """
    ws = get_ws()
    await ws.handle_client(websocket)