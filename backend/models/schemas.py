"""
TexGauge IQ - Pydantic Schemas
===============================
All request/response models for the REST API and WebSocket messages.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PortInfo(BaseModel):
    """Information about a detected COM port."""

    port: str = Field(..., description="COM port name (e.g. COM3)")
    description: str = Field("", description="Port description from OS")
    manufacturer: str = Field("", description="Port manufacturer")
    vid: str = Field("", description="USB Vendor ID")
    pid: str = Field("", description="USB Product ID")
    busy: bool = Field(False, description="Whether port is in use")
    connected: bool = Field(False, description="Whether a device is connected")


class PortScanResult(BaseModel):
    """Result of a port scan operation."""

    ports: List[PortInfo] = Field(default_factory=list)
    count: int = Field(0, description="Number of ports found")
    success: bool = True
    message: str = ""


class ConnectRequest(BaseModel):
    """Request to connect to a scale."""

    port: Optional[str] = Field(None, description="COM port to connect to")
    baud_rate: Optional[int] = Field(None, description="Baud rate")
    auto_detect: bool = Field(True, description="Auto-detect port and baud rate")


class ScaleStatus(BaseModel):
    """Current scale connection status."""

    connected: bool = False
    port: Optional[str] = None
    baud_rate: Optional[int] = None
    brand: str = "generic"
    reading: bool = False
    stable: bool = False
    units: str = "grams"
    uptime: float = 0.0
    packets_received: int = 0
    packets_lost: int = 0
    reconnect_count: int = 0
    last_error: Optional[str] = None


class WeightReading(BaseModel):
    """A single weight reading from the scale."""

    weight: float = 0.0
    stable: bool = False
    units: str = "grams"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    port: Optional[str] = None
    device_name: Optional[str] = None
    overload: bool = False
    underload: bool = False


class HealthResponse(BaseModel):
    """Backend health check response."""

    status: str = "healthy"
    version: str = "1.0.0"
    uptime: float = 0.0
    scale_connected: bool = False
    websocket_clients: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class DiagnosticsResponse(BaseModel):
    """Detailed backend diagnostics."""

    python_version: str = ""
    os: str = ""
    os_version: str = ""
    hostname: str = ""
    backend_uptime: float = 0.0
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_used_mb: float = 0.0
    available_ports: List[PortInfo] = Field(default_factory=list)
    connected_device: Optional[str] = None
    connection_duration: float = 0.0
    packets_received: int = 0
    packets_lost: int = 0
    reconnect_count: int = 0
    last_errors: List[str] = Field(default_factory=list)
    config: Dict[str, Any] = Field(default_factory=dict)
    websocket_clients: int = 0


class ConfigUpdateRequest(BaseModel):
    """Request to update configuration."""

    updates: Dict[str, Any] = Field(..., description="Config updates using dot notation")


class LogEntry(BaseModel):
    """A single log entry."""

    timestamp: str = ""
    level: str = ""
    logger: str = ""
    message: str = ""


class TareResponse(BaseModel):
    """Response from tare/zero command."""

    success: bool = True
    message: str = ""
    previous_weight: float = 0.0


class ScaleCommandResponse(BaseModel):
    """Generic response for scale commands."""

    success: bool = True
    message: str = ""
    data: Optional[Any] = None