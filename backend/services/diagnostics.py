"""
TexGauge IQ - Diagnostics Service
==================================
Provides system diagnostics, health monitoring, and performance metrics.
"""

import os
import platform
import time
from typing import List

from backend.config import config
from backend.models.schemas import DiagnosticsResponse, PortInfo
from backend.utils.logger import get_logger

logger = get_logger("diagnostics")


class DiagnosticsService:
    """
    System diagnostics service that collects health metrics,
    system information, and performance data.
    """

    def __init__(self, serial_service=None, websocket_manager=None):
        self._serial_service = serial_service
        self._websocket_manager = websocket_manager
        self._start_time = time.time()
        self._error_history: List[str] = []
        self._max_errors = 50

    def set_serial_service(self, serial_service):
        """Set the serial service reference."""
        self._serial_service = serial_service

    def set_websocket_manager(self, websocket_manager):
        """Set the websocket manager reference."""
        self._websocket_manager = websocket_manager

    def add_error(self, error: str):
        """Add an error to the history."""
        self._error_history.append(error)
        if len(self._error_history) > self._max_errors:
            self._error_history.pop(0)

    async def get_diagnostics(self) -> DiagnosticsResponse:
        """Get comprehensive system diagnostics."""
        # System info
        python_version = platform.python_version()
        os_name = platform.system()
        os_version = platform.version()
        hostname = platform.node()

        # Backend uptime
        backend_uptime = time.time() - self._start_time

        # CPU and memory (basic)
        cpu_percent = 0.0
        memory_percent = 0.0
        memory_used_mb = 0.0

        try:
            import psutil

            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / (1024 * 1024)
        except ImportError:
            logger.debug("psutil not available for CPU/memory stats")
        except Exception as e:
            logger.debug(f"Error getting system stats: {e}")

        # Available ports
        available_ports: List[PortInfo] = []
        if self._serial_service:
            try:
                available_ports = await self._serial_service.scan_ports()
            except Exception as e:
                logger.error(f"Error scanning ports for diagnostics: {e}")

        # Connection info
        connected_device = None
        connection_duration = 0.0
        packets_received = 0
        packets_lost = 0
        reconnect_count = 0

        if self._serial_service:
            status = self._serial_service.get_status()
            if status.connected:
                connected_device = status.port
                connection_duration = status.uptime
            packets_received = status.packets_received
            packets_lost = status.packets_lost
            reconnect_count = status.reconnect_count

        # WebSocket clients
        ws_clients = 0
        if self._websocket_manager:
            ws_clients = self._websocket_manager.client_count()

        # Last errors
        last_errors = list(self._error_history[-10:])

        return DiagnosticsResponse(
            python_version=python_version,
            os=os_name,
            os_version=os_version,
            hostname=hostname,
            backend_uptime=round(backend_uptime, 2),
            cpu_percent=round(cpu_percent, 1),
            memory_percent=round(memory_percent, 1),
            memory_used_mb=round(memory_used_mb, 1),
            available_ports=available_ports,
            connected_device=connected_device,
            connection_duration=round(connection_duration, 2),
            packets_received=packets_received,
            packets_lost=packets_lost,
            reconnect_count=reconnect_count,
            last_errors=last_errors,
            config=config.get_all(),
            websocket_clients=ws_clients,
        )

    def get_uptime(self) -> float:
        """Get backend uptime in seconds."""
        return time.time() - self._start_time