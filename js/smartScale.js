// ============================================================
// TexGauge IQ - Smart Scale Integration Module
// Web Serial API / Bluetooth / Simulation fallback
// ============================================================

const ScaleManager = {
  port: null,
  reader: null,
  isConnected: false,
  useSimulation: true,
  onWeightRead: null,
  simulationInterval: null,

  // Initialize scale system
  async init() {
    // Check if Web Serial API is available
    if ('serial' in navigator) {
      this.useSimulation = false;
    } else {
      console.log('Web Serial API not available. Using simulation mode.');
      this.useSimulation = true;
    }
  },

  // Connect to scale
  async connect() {
    if (this.isConnected) {
      await this.disconnect();
      return;
    }

    if (this.useSimulation) {
      this.isConnected = true;
      this.startSimulation();
      return { success: true, mode: 'simulation' };
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      
      this.reader = this.port.readable.getReader();
      this.isConnected = true;
      this.readLoop();
      return { success: true, mode: 'serial' };
    } catch (err) {
      console.error('Scale connection failed:', err);
      // Fall back to simulation
      this.useSimulation = true;
      this.isConnected = true;
      this.startSimulation();
      return { success: true, mode: 'simulation_fallback' };
    }
  },

  // Disconnect scale
  async disconnect() {
    this.isConnected = false;
    this.stopSimulation();
    
    if (this.reader) {
      try {
        await this.reader.cancel();
        this.reader = null;
      } catch (e) {}
    }
    if (this.port) {
      try {
        await this.port.close();
        this.port = null;
      } catch (e) {}
    }
  },

  // Read loop for serial data
  async readLoop() {
    while (this.isConnected && this.reader) {
      try {
        const { value, done } = await this.reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        const weight = parseFloat(text.trim());
        if (!isNaN(weight) && weight > 0) {
          this.onWeightRead?.(round(weight, 2));
        }
      } catch (err) {
        console.error('Scale read error:', err);
        break;
      }
    }
  },

  // Simulation - generates realistic sliver weights
  startSimulation() {
    this.stopSimulation();
    let count = 0;
    const baseWeight = 110; // base sliver weight in grams
    
    this.simulationInterval = setInterval(() => {
      if (!this.isConnected) return;
      count++;
      // Generate realistic weight with small variation
      const variation = (Math.random() - 0.5) * 4; // ±2g variation
      const weight = round(baseWeight + variation, 2);
      // Simulate occasional readings (every 2-3 seconds)
      if (count % 3 === 0) {
        this.onWeightRead?.(weight);
      }
    }, 1000);
  },

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  },

  // Toggle connection status
  getStatus() {
    if (this.isConnected) {
      return { connected: true, mode: this.useSimulation ? 'Simulation' : 'Serial Scale' };
    }
    return { connected: false, mode: 'Disconnected' };
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => ScaleManager.init());