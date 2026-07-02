"""
TexGauge IQ - Serial Scale Service
===================================
Professional serial communication service for industrial scales.
Handles auto-detection, connection, reconnection, data parsing,
and robust error recovery for all RS232-compatible scales.
"""

import asyncio
import re
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

from backend.config import config
from backend.models.schemas import (
    PortInfo,
    ScaleStatus,
    WeightReading,
    TareResponse,
    ScaleCommandResponse,
)
from backend.utils.logger import get_logger

logger = get_logger("serial_service")

# Standard baud rates for industrial scales
BAUD_RATES = [4800, 9600, 19200, 38400, 57600, 115200]

# Standard serial configurations to try
SERIAL_CONFIGS = [
    {"baudrate": 9600, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 4800, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 19200, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 38400, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 57600, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 115200, "bytesize": 8, "stopbits": 1, "parity": "N"},
    {"baudrate": 9600, "bytesize": 7, "stopbits": 1, "parity": "E"},
    {"baudrate": 9600, "bytesize": 7, "stopbits": 1, "parity": "O"},
]

# Weight patterns for various scale brands
WEIGHT_PATTERNS = [
    # Generic: any number with optional decimal
    re.compile(r"(-?\d+\.?\d*)\s*(g|kg|oz|lb)?"),
    # A&D format: ST,GS,+123.45g
    re.compile(r"[A-Z]{2},[A-Z]{2},[+-]?(\d+\.?\d*)"),
    # Ohaus format: 123.45 g
    re.compile(r"(\d+\.\d+)\s*g"),
    # CAS format: WT+123.45g
    re.compile(r"WT[+-]?(\d+\.?\d*)"),
    # Mettler Toledo format: S 123.45 g
    re.compile(r"[S]\s+(\d+\.?\d*)"),
    # Shimadzu format: 123.45g
    re.compile(r"(\d+\.\d+)g"),
]


class SerialScaleService:
    """
    Professional serial scale service with auto-detection,
    reconnection, error recovery, and multi-brand support.
    """

    def __init__(self):
        self._serial = None
        self._reader_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._weight_callbacks: List[Callable] = []
        self._status_callbacks: List[Callable] = []

        # State
        self._connected = False
        self._reading = False
        self._port: Optional[str] = None
        self._baud_rate: Optional[int] = None
        self._brand: str = "generic"
        self._start_time: float = 0.0
        self._packets_received: int = 0
        self._packets_lost: int = 0
        self._reconnect_count: int = 0
        self._last_error: Optional[str] = None
        self._last_weight: float = 0.0
        self._last_stable: bool = False
        self._errors: List[str] = []
        self._lock = asyncio.Lock()
        self._running = False
        self._tare_offset: float = 0.0

        logger.info("SerialScaleService initialized")

    # ==================== PORT DETECTION ====================

    async def scan_ports(self) -> List[PortInfo]:
        """
        Scan COM1-COM256 for available serial ports.
        Returns detailed information about each port.
        """
        ports = []
        try:
            import serial.tools.list_ports

            com_ports = list(serial.tools.list_ports.comports())
            for port in com_ports:
                port_info = PortInfo(
                    port=port.device,
                    description=port.description or "",
                    manufacturer=port.manufacturer or "",
                    vid=f"{port.vid:04X}" if port.vid else "",
                    pid=f"{port.pid:04X}" if port.pid else "",
                    busy=False,
                    connected=True,
                )
                ports.append(port_info)
                logger.debug(f"Detected port: {port.device} - {port.description}")

            # If no ports found via pyserial, try manual COM scan (Windows)
            if not ports:
                ports = await self._manual_com_scan()

        except ImportError:
            logger.warning("pyserial not installed, using manual COM scan")
            ports = await self._manual_com_scan()
        except Exception as e:
            logger.error(f"Port scan error: {e}")
            ports = await self._manual_com_scan()

        return ports

    async def _manual_com_scan(self) -> List[PortInfo]:
        """Manual COM port scanning for Windows."""
        ports = []
        for i in range(1, 257):
            port_name = f"COM{i}"
            try:
                import serial

                s = serial.Serial(port_name)
                s.close()
                ports.append(PortInfo(port=port_name, connected=True))
                logger.info(f"Found port via manual scan: {port_name}")
            except (serial.SerialException, OSError):
                pass
        return ports

    async def auto_detect_port(self) -> Optional[str]:
        """
        Automatically detect the correct COM port by trying
        to read weight data from each available port.
        """
        ports = await self.scan_ports()
        if not ports:
            logger.warning("No ports found during auto-detect")
            return None

        logger.info(f"Auto-detecting port from {len(ports)} available ports")

        for port_info in ports:
            for baud in BAUD_RATES:
                try:
                    import serial

                    s = serial.Serial(
                        port=port_info.port,
                        baudrate=baud,
                        bytesize=8,
                        stopbits=1,
                        parity=serial.PARITY_NONE,
                        timeout=1.0,
                    )
                    # Try to read some data
                    data = s.read(100)
                    s.close()

                    if data and self._looks_like_scale_data(data):
                        logger.info(
                            f"Auto-detected scale on {port_info.port} at {baud} baud"
                        )
                        return port_info.port
                except Exception:
                    continue

        # If no auto-detect, return first available port
        if ports:
            logger.info(f"No scale data detected, using first port: {ports[0].port}")
            return ports[0].port

        return None

    def _looks_like_scale_data(self, data: bytes) -> bool:
        """Check if data looks like it came from a scale."""
        try:
            text = data.decode("ascii", errors="ignore").strip()
            if not text:
                return False
            # Look for numbers that could be weights
            return bool(re.search(r"\d+\.?\d*", text))
        except Exception:
            return False

    # ==================== CONNECTION ====================

    async def connect(
        self, port: Optional[str] = None, baud_rate: Optional[int] = None
    ) -> ScaleCommandResponse:
        """
        Connect to a scale on the specified port.
        If no port specified, auto-detect.
        If no baud rate specified, auto-detect.
        """
        async with self._lock:
            if self._connected:
                return ScaleCommandResponse(
                    success=False, message="Already connected to a scale"
                )

            try:
                import serial

                # Auto-detect port if not specified
                if not port:
                    detected = await self.auto_detect_port()
                    if not detected:
                        return ScaleCommandResponse(
                            success=False,
                            message="No COM ports found. Please check scale connection.",
                        )
                    port = detected

                # Auto-detect baud rate if not specified
                if not baud_rate:
                    baud_rate = await self._auto_detect_baud(port)

                # Open serial connection
                self._serial = serial.Serial(
                    port=port,
                    baudrate=baud_rate or 9600,
                    bytesize=config.get("serial.data_bits", 8),
                    stopbits=config.get("serial.stop_bits", 1),
                    parity=config.get("serial.parity", "N"),
                    timeout=config.get("serial.timeout", 2.0),
                )

                self._port = port
                self._baud_rate = baud_rate or 9600
                self._connected = True
                self._start_time = time.time()
                self._running = True
                self._reconnect_count = 0
                self._last_error = None

                logger.info(
                    f"Connected to scale on {port} at {self._baud_rate} baud"
                )

                # Start background tasks
                self._reader_task = asyncio.create_task(self._read_loop())
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

                self._notify_status()

                return ScaleCommandResponse(
                    success=True,
                    message=f"Connected to {port} at {self._baud_rate} baud",
                    data={
                        "port": port,
                        "baud_rate": self._baud_rate,
                        "brand": self._brand,
                    },
                )

            except ImportError:
                return ScaleCommandResponse(
                    success=False,
                    message="PySerial is not installed. Run: pip install pyserial",
                )
            except serial.SerialException as e:
                error_msg = str(e)
                self._last_error = error_msg
                self._errors.append(error_msg)
                logger.error(f"Serial connection failed on {port}: {error_msg}")

                if "Permission denied" in error_msg:
                    return ScaleCommandResponse(
                        success=False,
                        message=f"Permission denied for {port}. Close other applications using this port.",
                    )
                elif "FileNotFoundError" in error_msg or "does not exist" in error_msg:
                    return ScaleCommandResponse(
                        success=False,
                        message=f"Port {port} does not exist. Check scale connection.",
                    )
                elif "Access is denied" in error_msg or "AccessError" in error_msg:
                    return ScaleCommandResponse(
                        success=False,
                        message=f"Access denied for {port}. Port may be in use by another application.",
                    )
                else:
                    return ScaleCommandResponse(
                        success=False,
                        message=f"Failed to connect: {error_msg}",
                    )
            except Exception as e:
                error_msg = str(e)
                self._last_error = error_msg
                self._errors.append(error_msg)
                logger.error(f"Unexpected connection error: {error_msg}")
                return ScaleCommandResponse(
                    success=False, message=f"Unexpected error: {error_msg}"
                )

    async def _auto_detect_baud(self, port: str) -> Optional[int]:
        """Auto-detect the correct baud rate for a scale."""
        import serial

        for config_item in SERIAL_CONFIGS:
            try:
                s = serial.Serial(
                    port=port,
                    baudrate=config_item["baudrate"],
                    bytesize=config_item["bytesize"],
                    stopbits=config_item["stopbits"],
                    parity=config_item["parity"],
                    timeout=1.0,
                )
                data = s.read(100)
                s.close()

                if data and self._looks_like_scale_data(data):
                    logger.info(
                        f"Auto-detected baud rate: {config_item['baudrate']} on {port}"
                    )
                    return config_item["baudrate"]
            except Exception:
                continue

        logger.warning(f"Could not auto-detect baud rate for {port}, using 9600")
        return 9600

    async def disconnect(self) -> ScaleCommandResponse:
        """Disconnect from the scale."""
        async with self._lock:
            self._running = False
            self._reading = False

            # Cancel background tasks
            for task in [self._reader_task, self._reconnect_task, self._heartbeat_task]:
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except (asyncio.CancelledError, Exception):
                        pass

            self._reader_task = None
            self._reconnect_task = None
            self._heartbeat_task = None

            # Close serial port
            if self._serial:
                try:
                    self._serial.close()
                except Exception as e:
                    logger.error(f"Error closing serial port: {e}")
                self._serial = None

            self._connected = False
            self._port = None
            self._baud_rate = None
            self._tare_offset = 0.0

            logger.info("Disconnected from scale")
            self._notify_status()

            return ScaleCommandResponse(success=True, message="Disconnected")

    # ==================== READ LOOP ====================

    async def _read_loop(self):
        """Continuous read loop for weight data."""
        buffer = b""
        consecutive_errors = 0
        max_consecutive_errors = 10

        while self._running and self._connected:
            try:
                if not self._serial or not self._serial.is_open:
                    await self._handle_disconnection()
                    break

                # Read available data
                if self._serial.in_waiting:
                    data = self._serial.read(self._serial.in_waiting)
                    buffer += data
                    consecutive_errors = 0

                    # Process complete lines
                    lines = buffer.split(b"\r\n")
                    if len(lines) > 1:
                        buffer = lines[-1]  # Keep incomplete line
                        for line in lines[:-1]:
                            if line.strip():
                                await self._process_line(line)
                else:
                    # No data available, small sleep to prevent busy-wait
                    await asyncio.sleep(config.get("scale.read_interval", 0.05))

            except asyncio.CancelledError:
                break
            except Exception as e:
                consecutive_errors += 1
                error_msg = f"Read loop error ({consecutive_errors}/{max_consecutive_errors}): {e}"
                logger.warning(error_msg)

                if consecutive_errors >= max_consecutive_errors:
                    logger.error("Too many consecutive errors, triggering reconnect")
                    await self._handle_disconnection()
                    break

                await asyncio.sleep(0.1)

    async def _process_line(self, line: bytes):
        """Process a single line of serial data."""
        try:
            text = line.decode("ascii", errors="ignore").strip()
            if not text:
                return

            self._packets_received += 1

            # Try to extract weight using various patterns
            weight = self._parse_weight(text)

            if weight is not None:
                # Apply tare offset
                displayed_weight = weight - self._tare_offset
                if displayed_weight < 0:
                    displayed_weight = 0.0

                # Check for overload/underload
                overload = weight > config.get("scale.weight_max", 1000.0)
                underload = weight < config.get("scale.weight_min", 0.1) and weight > 0

                # Determine stability (simple heuristic: small change from last reading)
                stable = abs(weight - self._last_weight) < config.get(
                    "scale.stable_threshold", 0.05
                )

                self._last_weight = weight
                self._last_stable = stable

                reading = WeightReading(
                    weight=round(displayed_weight, 2),
                    stable=stable,
                    units=config.get("scale.units", "grams"),
                    timestamp=datetime.now().isoformat(),
                    port=self._port,
                    device_name=f"Scale on {self._port}",
                    overload=overload,
                    underload=underload,
                )

                # Notify callbacks
                for cb in self._weight_callbacks:
                    try:
                        if asyncio.iscoroutinefunction(cb):
                            await cb(reading)
                        else:
                            cb(reading)
                    except Exception as e:
                        logger.error(f"Weight callback error: {e}")

        except Exception as e:
            logger.debug(f"Line processing error: {e}")

    def _parse_weight(self, text: str) -> Optional[float]:
        """Parse weight value from scale output text."""
        # Try each pattern
        for pattern in WEIGHT_PATTERNS:
            match = pattern.search(text)
            if match:
                try:
                    weight = float(match.group(1))
                    # Sanity check
                    if 0 < weight < 10000:
                        return weight
                except (ValueError, IndexError):
                    continue

        # Fallback: try to find any number in the text
        numbers = re.findall(r"(\d+\.?\d*)", text)
        for num in numbers:
            try:
                weight = float(num)
                if 0 < weight < 10000:
                    return weight
            except ValueError:
                continue

        return None

    # ==================== HEARTBEAT ====================

    async def _heartbeat_loop(self):
        """Periodic heartbeat to check connection health."""
        while self._running and self._connected:
            try:
                await asyncio.sleep(config.get("websocket.heartbeat_interval", 5.0))

                if self._serial and not self._serial.is_open:
                    logger.warning("Heartbeat detected closed port")
                    await self._handle_disconnection()
                    break

                # Check if we've been reading data
                if self._packets_received == 0 and self._connected:
                    logger.warning("No data received from scale, possible issue")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")

    # ==================== RECONNECTION ====================

    async def _handle_disconnection(self):
        """Handle unexpected disconnection with auto-reconnect."""
        self._connected = False
        self._packets_lost += 1
        error_msg = f"Connection lost on {self._port}"
        self._last_error = error_msg
        self._errors.append(error_msg)
        logger.warning(error_msg)
        self._notify_status()

        # Clean up serial
        if self._serial:
            try:
                self._serial.close()
            except Exception:
                pass
            self._serial = None

        # Auto-reconnect if enabled
        if config.get("serial.auto_reconnect", True):
            self._reconnect_task = asyncio.create_task(self._reconnect_loop())

    async def _reconnect_loop(self):
        """Attempt to reconnect with exponential backoff."""
        max_retries = config.get("serial.max_retries", 10)
        base_interval = config.get("serial.reconnect_interval", 3.0)
        use_backoff = config.get("serial.exponential_backoff", True)

        for attempt in range(1, max_retries + 1):
            if not self._running:
                break

            delay = base_interval * (2 ** (attempt - 1) if use_backoff else 1)
            delay = min(delay, 60.0)  # Cap at 60 seconds

            logger.info(
                f"Reconnect attempt {attempt}/{max_retries} in {delay:.1f}s..."
            )

            await asyncio.sleep(delay)

            try:
                import serial

                s = serial.Serial(
                    port=self._port,
                    baudrate=self._baud_rate or 9600,
                    timeout=1.0,
                )
                s.close()

                # Reconnect
                result = await self.connect(port=self._port, baud_rate=self._baud_rate)
                if result.success:
                    self._reconnect_count += 1
                    logger.info(f"Reconnected successfully after {attempt} attempts")
                    return

            except serial.SerialException:
                continue
            except Exception as e:
                logger.debug(f"Reconnect attempt {attempt} failed: {e}")
                continue

        logger.error(f"Failed to reconnect after {max_retries} attempts")
        self._last_error = f"Reconnect failed after {max_retries} attempts"
        self._notify_status()

    # ==================== COMMANDS ====================

    async def tare(self) -> TareResponse:
        """Tare the scale (zero out current weight)."""
        async with self._lock:
            if not self._connected:
                return TareResponse(
                    success=False, message="Scale not connected"
                )

            self._tare_offset = self._last_weight
            logger.info(f"Tare set: offset = {self._tare_offset:.2f}g")

            # Send tare command if scale supports it
            try:
                if self._serial and self._serial.is_open:
                    # Common tare commands for different brands
                    tare_commands = {
                        "and": b"T\r\n",
                        "ohaus": b"T\r\n",
                        "mettler": b"T\r\n",
                        "shimadzu": b"T\r\n",
                        "cas": b"T\r\n",
                        "generic": b"T\r\n",
                    }
                    cmd = tare_commands.get(self._brand, b"T\r\n")
                    self._serial.write(cmd)
            except Exception as e:
                logger.warning(f"Could not send tare command: {e}")

            return TareResponse(
                success=True,
                message=f"Tare set. Offset: {self._tare_offset:.2f}g",
                previous_weight=self._tare_offset,
            )

    async def zero(self) -> TareResponse:
        """Zero the scale."""
        return await self.tare()

    async def restart(self) -> ScaleCommandResponse:
        """Restart the scale connection."""
        await self.disconnect()
        await asyncio.sleep(1)
        return await self.connect(port=self._port, baud_rate=self._baud_rate)

    # ==================== READING CONTROL ====================

    def start_reading(self):
        """Start active reading mode."""
        self._reading = True
        logger.info("Reading started")
        self._notify_status()

    def stop_reading(self):
        """Stop active reading mode."""
        self._reading = False
        logger.info("Reading stopped")
        self._notify_status()

    # ==================== STATUS ====================

    def get_status(self) -> ScaleStatus:
        """Get current scale status."""
        return ScaleStatus(
            connected=self._connected,
            port=self._port,
            baud_rate=self._baud_rate,
            brand=self._brand,
            reading=self._reading,
            stable=self._last_stable,
            units=config.get("scale.units", "grams"),
            uptime=time.time() - self._start_time if self._start_time else 0.0,
            packets_received=self._packets_received,
            packets_lost=self._packets_lost,
            reconnect_count=self._reconnect_count,
            last_error=self._last_error,
        )

    def get_last_reading(self) -> WeightReading:
        """Get the last weight reading."""
        return WeightReading(
            weight=round(self._last_weight - self._tare_offset, 2),
            stable=self._last_stable,
            units=config.get("scale.units", "grams"),
            timestamp=datetime.now().isoformat(),
            port=self._port,
            device_name=f"Scale on {self._port}" if self._port else None,
        )

    # ==================== CALLBACKS ====================

    def on_weight(self, callback: Callable):
        """Register a weight reading callback."""
        self._weight_callbacks.append(callback)
        return lambda: self._weight_callbacks.remove(callback)

    def on_status_change(self, callback: Callable):
        """Register a status change callback."""
        self._status_callbacks.append(callback)
        return lambda: self._status_callbacks.remove(callback)

    def _notify_status(self):
        """Notify status change callbacks."""
        status = self.get_status()
        for cb in self._status_callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    asyncio.ensure_future(cb(status))
                else:
                    cb(status)
            except Exception as e:
                logger.error(f"Status callback error: {e}")

    # ==================== CLEANUP ====================

    async def cleanup(self):
        """Clean up all resources."""
        logger.info("Cleaning up serial service")
        self._running = False

        for task in [self._reader_task, self._reconnect_task, self._heartbeat_task]:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

        if self._serial:
            try:
                self._serial.close()
            except Exception:
                pass
            self._serial = None

        self._connected = False
        self._weight_callbacks.clear()
        self._status_callbacks.clear()
        logger.info("Serial service cleaned up")