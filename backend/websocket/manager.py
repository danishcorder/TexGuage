"""
TexGauge IQ - WebSocket Manager
================================
Manages WebSocket connections for real-time weight data broadcasting.
Handles client connections, disconnections, heartbeats, and broadcasting.
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Set

from fastapi import WebSocket, WebSocketDisconnect

from backend.config import config
from backend.models.schemas import WeightReading
from backend.utils.logger import get_logger

logger = get_logger("websocket")


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts real-time weight data
    to all connected clients.
    """

    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._last_reading: Dict[str, Any] = {}
        self._broadcast_task: asyncio.Task = None
        self._running = False
        self._serial_service = None

    def set_serial_service(self, serial_service):
        """Set the serial service reference for data source."""
        self._serial_service = serial_service

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self._connections)}")

        # Send initial status
        if self._serial_service:
            status = self._serial_service.get_status()
            await self._send_json(websocket, {
                "type": "status",
                "data": status.model_dump(),
            })

    async def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket client."""
        async with self._lock:
            self._connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(self._connections)}")

    async def broadcast_weight(self, reading: WeightReading):
        """Broadcast a weight reading to all connected clients."""
        message = {
            "type": "weight",
            "data": reading.model_dump(),
        }
        await self._broadcast(message)

    async def broadcast_status(self, status: Any):
        """Broadcast status update to all connected clients."""
        message = {
            "type": "status",
            "data": status.model_dump() if hasattr(status, "model_dump") else status,
        }
        await self._broadcast(message)

    async def broadcast_heartbeat(self):
        """Broadcast heartbeat to all connected clients."""
        message = {
            "type": "heartbeat",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "client_count": len(self._connections),
            },
        }
        await self._broadcast(message)

    async def _broadcast(self, message: Dict[str, Any]):
        """Send a message to all connected clients."""
        if not self._connections:
            return

        disconnected = set()
        async with self._lock:
            for websocket in self._connections:
                try:
                    await self._send_json(websocket, message)
                except Exception:
                    disconnected.add(websocket)

        # Clean up disconnected clients
        for ws in disconnected:
            await self.disconnect(ws)

    async def _send_json(self, websocket: WebSocket, data: Dict[str, Any]):
        """Send JSON data to a single WebSocket client."""
        try:
            await websocket.send_json(data)
        except (WebSocketDisconnect, RuntimeError, Exception) as e:
            logger.debug(f"Error sending to WebSocket client: {e}")
            raise

    async def handle_client(self, websocket: WebSocket):
        """
        Handle a WebSocket client connection lifecycle.
        Listens for client messages and maintains connection.
        """
        await self.connect(websocket)
        try:
            while True:
                try:
                    data = await websocket.receive_text()
                    # Handle client messages (e.g., ping/pong)
                    msg = json.loads(data)
                    if msg.get("type") == "ping":
                        await self._send_json(websocket, {
                            "type": "pong",
                            "data": {"timestamp": datetime.now().isoformat()},
                        })
                except json.JSONDecodeError:
                    pass
        except WebSocketDisconnect:
            logger.debug("WebSocket client disconnected normally")
        except Exception as e:
            logger.error(f"WebSocket client error: {e}")
        finally:
            await self.disconnect(websocket)

    def client_count(self) -> int:
        """Get the number of connected clients."""
        return len(self._connections)

    async def start_broadcast_loop(self):
        """
        Start the background broadcast loop that sends
        weight data at regular intervals.
        """
        if self._broadcast_task and not self._broadcast_task.done():
            return

        self._running = True
        self._broadcast_task = asyncio.create_task(self._broadcast_loop())
        logger.info("WebSocket broadcast loop started")

    async def _broadcast_loop(self):
        """Background loop for broadcasting weight data."""
        heartbeat_interval = config.get("websocket.heartbeat_interval", 5.0)
        last_heartbeat = time.time()

        while self._running:
            try:
                # Broadcast current weight if available
                if self._serial_service:
                    reading = self._serial_service.get_last_reading()
                    await self.broadcast_weight(reading)

                # Periodic heartbeat
                now = time.time()
                if now - last_heartbeat >= heartbeat_interval:
                    await self.broadcast_heartbeat()
                    last_heartbeat = now

                await asyncio.sleep(config.get("websocket.broadcast_interval", 0.05))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Broadcast loop error: {e}")
                await asyncio.sleep(1)

    async def stop_broadcast_loop(self):
        """Stop the background broadcast loop."""
        self._running = False
        if self._broadcast_task and not self._broadcast_task.done():
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except (asyncio.CancelledError, Exception):
                pass
        logger.info("WebSocket broadcast loop stopped")

    async def cleanup(self):
        """Clean up all WebSocket connections."""
        await self.stop_broadcast_loop()
        async with self._lock:
            for websocket in self._connections:
                try:
                    await websocket.close()
                except Exception:
                    pass
            self._connections.clear()
        logger.info("WebSocket manager cleaned up")