# TexGauge IQ - Industrial Scale Backend Setup

## 📋 Overview

TexGauge IQ is a textile quality monitoring system with a Python FastAPI backend that communicates with industrial weighing scales via serial ports (RS232/USB). The backend replaces the browser's Web Serial API with professional REST APIs and WebSockets.

## 🏗️ Architecture

```
Frontend (Browser)
    ↓ REST API / WebSocket
Backend (Python FastAPI)  ← Port 8000
    ↓ PySerial
Industrial Scale (RS232)
```

## 📁 Project Structure

```
industry project/
├── backend/                    # Python backend
│   ├── main.py                # FastAPI application entry point
│   ├── run.py                 # Simple runner script
│   ├── requirements.txt       # Python dependencies
│   ├── config/
│   │   ├── __init__.py
│   │   ├── config.json        # Application configuration
│   │   └── config_manager.py  # Configuration manager
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py         # Pydantic data models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── serial_service.py  # Serial scale communication
│   │   └── diagnostics.py     # System diagnostics
│   ├── websocket/
│   │   ├── __init__.py
│   │   └── manager.py         # WebSocket connection manager
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py          # REST API endpoints
│   ├── utils/
│   │   ├── __init__.py
│   │   └── logger.py          # Rotating file logger
│   └── logs/                  # Log files (auto-created)
├── index.html                 # Frontend (unchanged)
├── pages/                     # Department pages (unchanged)
├── js/                        # JavaScript files
│   ├── smartScale.js          # ← REPLACED: uses backend API now
│   └── ... (all other files unchanged)
├── css/                       # CSS files (unchanged)
├── start-server.bat           # Updated to start both servers
└── README-SCALE-SETUP.md      # This file
```

## 🚀 Quick Start

### Prerequisites

- Windows 10/11, Linux, or macOS
- Python 3.12 or higher
- Industrial scale with RS232/USB connection

### Installation

1. **Open Command Prompt or PowerShell** in the project directory:

```bash
cd \path\to\industry project
```

2. **Install dependencies:**

```bash
cd backend
pip install -r requirements.txt
cd ..
```

3. **Start both servers** (Recommended):

Double-click `start-server.bat` OR run:

```bash
start-server.bat
```

This will:
- Start the backend API on `http://localhost:8000`
- Start the frontend server on `http://localhost:8080`

### Manual Start

**Backend only:**
```bash
python backend/run.py
```

**Frontend only (if backend is already running):**
```bash
python -m http.server 8080
```

## 🌐 Accessing the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:8080/pages/carding.html | Main application |
| API Docs | http://localhost:8000/docs | Swagger documentation |
| API | http://localhost:8000/api/health | Health check |

## 📡 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Backend health check |
| GET | `/api/status` | Scale connection status |
| GET | `/api/ports` | List available COM ports |
| POST | `/api/scan` | Scan for COM ports |
| POST | `/api/connect` | Connect to scale (auto-detect) |
| POST | `/api/disconnect` | Disconnect from scale |
| GET | `/api/weight` | Get current weight reading |
| POST | `/api/tare` | Tare (zero) the scale |
| POST | `/api/zero` | Zero the scale |
| POST | `/api/restart` | Restart scale connection |
| GET | `/api/diagnostics` | System diagnostics |
| GET | `/api/config` | Get configuration |
| POST | `/api/config` | Update configuration |
| GET | `/api/logs` | Recent log entries |

## 🔌 WebSocket

- **Endpoint:** `ws://localhost:8000/api/ws/weight`
- **Messages received:**
  - `type: "weight"` - Real-time weight data
  - `type: "status"` - Scale connection status
  - `type: "heartbeat"` - Periodic keepalive

## ⚙️ Configuration

Configuration is stored in `backend/config/config.json`:

```json
{
  "serial": {
    "port": null,           // COM port (null = auto-detect)
    "baud_rate": 9600,      // Baud rate (null = auto-detect)
    "timeout": 2.0,         // Serial timeout in seconds
    "auto_reconnect": true, // Auto-reconnect on disconnect
    "reconnect_interval": 3.0,
    "max_retries": 10,
    "exponential_backoff": true
  },
  "scale": {
    "brand": "generic",     // Scale brand
    "weight_min": 0.1,
    "weight_max": 1000.0,
    "stable_threshold": 0.05
  },
  "server": {
    "host": "0.0.0.0",
    "port": 8000
  }
}
```

## 🔧 Supported Scale Brands

- **A&D** - Automatic detection and parsing
- **CAS** - WT format support
- **Essae** - Standard RS232
- **Ohaus** - Standard RS232
- **Shimadzu** - g format support
- **Citizen** - Standard RS232
- **Mettler Toledo** - S format support
- **Any RS232-compatible scale** - Generic number extraction

## 🛡️ Error Recovery

The backend handles automatically:

- Scale USB disconnected → Auto-reconnect with exponential backoff
- Scale power off → Auto-reconnect on power restore
- Cable removal → Port monitoring with heartbeat
- COM port busy → Clear error message
- Permission denied → User guidance
- Invalid packets → Graceful handling
- Backend crash → Never (comprehensive error handling)

## 📊 Diagnostics

Access diagnostics at `http://localhost:8000/api/diagnostics`

Provides:
- Python version and OS info
- CPU and memory usage
- Available COM ports
- Connection duration and statistics
- Packet receive/lost counts
- Reconnect history
- Recent error log
- Current configuration

## 🐍 Virtual Environment (Recommended)

```bash
python -m venv venv
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # Linux/Mac
pip install -r backend\requirements.txt
python backend\run.py
```

## 🔄 Future Extensions

The backend architecture supports:
- **Multiple scales** - Add scale routing
- **Barcode scanners** - Add serial listener
- **QR scanners** - Add camera input
- **PLC integration** - Add Modbus protocol
- **ERP integration** - Add REST/SOAP client
- **MES integration** - Add message queue
- **IoT/Cloud sync** - Add MQTT publisher
- **Database storage** - Add SQLAlchemy models

## ❌ Troubleshooting

### "Cannot reach backend"
✓ Ensure backend is running: `python backend/run.py`
✓ Check port 8000 is not blocked

### "No COM ports found"
✓ Connect the scale via USB
✓ Check Device Manager for COM port
✓ Try different USB port
✓ Install scale drivers

### "Permission denied"
✓ Close other applications using the port
✓ Run as Administrator (Windows)
✓ Check user has dialout permission (Linux)

### WebSocket not connecting
✓ Ensure backend is running on port 8000
✓ Check firewall settings
✓ Restart the backend

### Scale not reading
✓ Check scale is powered on
✓ Check cable connections
✓ Verify scale is in continuous transmission mode
✓ Try different baud rate in config