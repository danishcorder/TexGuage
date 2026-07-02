// ============================================================
// TexGauge IQ - Smart Scale Integration Module
// Backend API Bridge - Replaces Web Serial API
// Communicates with Python FastAPI backend via REST + WebSocket
// ============================================================

const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/api/ws/weight';

const ScaleManager = {
  ws: null,
  isConnected: false,
  isReading: false,
  onWeightRead: null,
  wsReconnectTimer: null,
  lastWeight: 0,
  lastStable: false,

  // Initialize scale system
  async init() {
    console.log('ScaleManager initialized (Backend API mode)');
    this.connectWebSocket();
  },

  // Connect to WebSocket for real-time weight data
  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected to backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'weight') {
            const data = msg.data;
            this.lastWeight = data.weight;
            this.lastStable = data.stable;

            // Call the weight callback if set
            if (this.onWeightRead && data.weight > 0) {
              this.onWeightRead(data.weight);
            }
          } else if (msg.type === 'status') {
            const data = msg.data;
            this.isConnected = data.connected;
            console.log('Scale status update:', data);
          } else if (msg.type === 'heartbeat') {
            // Heartbeat received, connection is alive
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s...');
        this.ws = null;
        // Auto-reconnect
        if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      // Retry connection
      if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
    }
  },

  // Send ping to keep WebSocket alive
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  },

  // Connect to scale via backend API
  async connect(port = null, baudRate = null) {
    console.log('Connecting to scale via backend...');

    try {
      const payload = {
        auto_detect: !port && !baudRate
      };
      if (port) payload.port = port;
      if (baudRate) payload.baud_rate = baudRate;

      const response = await fetch(`${BACKEND_URL}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        this.isConnected = true;
        console.log('Scale connected via backend:', result.message);
        return {
          success: true,
          mode: 'backend',
          portInfo: result.data
        };
      } else {
        console.error('Backend connection failed:', result.message);
        this.isConnected = false;
        return { success: false, error: result.message };
      }
    } catch (err) {
      console.error('Backend connection error:', err);
      this.isConnected = false;
      return {
        success: false,
        error: `Cannot reach backend at ${BACKEND_URL}. Is the Python server running?\n\nError: ${err.message}`
      };
    }
  },

  // Disconnect scale via backend API
  async disconnect() {
    this.isReading = false;
    this.isConnected = false;

    try {
      const response = await fetch(`${BACKEND_URL}/api/disconnect`, {
        method: 'POST'
      });
      const result = await response.json();
      console.log('Scale disconnected:', result.message);
      return result;
    } catch (err) {
      console.error('Disconnect error:', err);
      return { success: false, error: err.message };
    }
  },

  // Start reading weight data
  startReading() {
    if (this.isConnected) {
      this.isReading = true;
      console.log('Reading started');
    }
  },

  // Stop reading weight data (but keep connection)
  stopReading() {
    this.isReading = false;
    console.log('Reading stopped');
  },

  // Toggle reading state
  toggleReading() {
    if (!this.isConnected) {
      return { success: false, message: 'Scale not connected' };
    }

    this.isReading = !this.isReading;
    return {
      success: true,
      reading: this.isReading
    };
  },

  // Get connection status from backend
  async getStatus() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`);
      const status = await response.json();

      this.isConnected = status.connected;

      if (status.connected) {
        return {
          connected: true,
          mode: 'Backend Scale',
          reading: this.isReading,
          port: status.port,
          baudRate: status.baud_rate,
          brand: status.brand,
          stable: status.stable,
          uptime: status.uptime,
          packetsReceived: status.packets_received,
          packetsLost: status.packets_lost
        };
      }
      return { connected: false, mode: 'Disconnected', reading: false };
    } catch (err) {
      console.error('Status check error:', err);
      return { connected: false, mode: 'Backend Unreachable', reading: false };
    }
  },

  // Get current weight from backend
  async getWeight() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/weight`);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Get weight error:', err);
      return { weight: 0, stable: false };
    }
  },

  // Tare the scale via backend
  async tare() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tare`, {
        method: 'POST'
      });
      return await response.json();
    } catch (err) {
      console.error('Tare error:', err);
      return { success: false, message: err.message };
    }
  },

  // Zero the scale via backend
  async zero() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/zero`, {
        method: 'POST'
      });
      return await response.json();
    } catch (err) {
      console.error('Zero error:', err);
      return { success: false, message: err.message };
    }
  },

  // Scan for available COM ports via backend
  async scanPorts() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST'
      });
      return await response.json();
    } catch (err) {
      console.error('Port scan error:', err);
      return { ports: [], count: 0, success: false, message: err.message };
    }
  },

  // Check backend health
  async healthCheck() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      return await response.json();
    } catch (err) {
      return { status: 'unreachable', error: err.message };
    }
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => ScaleManager.init());