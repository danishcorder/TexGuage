// ============================================================
// TexGauge IQ - Real-Time Alert System
// Rule-based alerts with color coding
// ============================================================

const AlertSystem = {
  alerts: [],
  listeners: [],
  thresholds: {
    cv_warning: 3.5,
    cv_critical: 5.0,
    g_warning: 2.0,
    g_critical: 4.0,
    deviation_warning: 5,
    deviation_critical: 10
  },

  // Initialize
  init() {
    this.loadAlerts();
    setInterval(() => this.checkStaleAlerts(), 30000);
  },

  // Evaluate a sample record and generate alerts
  evaluate(record, department) {
    const newAlerts = [];
    const cv = Number(record.cv);
    const g = Number(record.g);

    // CV% alerts
    if (cv > this.thresholds.cv_critical) {
      newAlerts.push({
        id: Date.now() + Math.random(),
        type: 'critical',
        title: 'Critical CV%',
        message: `${department} M/C ${record.machine}: CV% = ${cv}% exceeds critical threshold!`,
        department,
        machine: record.machine,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        icon: '🔴'
      });
    } else if (cv > this.thresholds.cv_warning) {
      newAlerts.push({
        id: Date.now() + Math.random(),
        type: 'warning',
        title: 'CV% Warning',
        message: `${department} M/C ${record.machine}: CV% = ${cv}% is above warning threshold.`,
        department,
        machine: record.machine,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        icon: '🟡'
      });
    }

    // G/Y% deviation alerts
    const targetG = (Number(document.getElementById('gMin')?.value) + Number(document.getElementById('gMax')?.value)) / 2;
    const deviation = Math.abs(g - targetG);
    
    if (deviation > this.thresholds.g_critical) {
      newAlerts.push({
        id: Date.now() + Math.random(),
        type: 'critical',
        title: 'Critical Weight Deviation',
        message: `${department} M/C ${record.machine}: G/Y% = ${g}% deviates ${deviation.toFixed(1)}% from target!`,
        department,
        machine: record.machine,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        icon: '🔴'
      });
    } else if (deviation > this.thresholds.g_warning) {
      newAlerts.push({
        id: Date.now() + Math.random(),
        type: 'warning',
        title: 'Weight Deviation Warning',
        message: `${department} M/C ${record.machine}: G/Y% deviation = ${deviation.toFixed(1)}%`,
        department,
        machine: record.machine,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        icon: '🟡'
      });
    }

    // If within range, add green normal status
    if (newAlerts.length === 0 && record.status === 'ACCEPTED') {
      newAlerts.push({
        id: Date.now() + Math.random(),
        type: 'normal',
        title: 'Normal Operation',
        message: `${department} M/C ${record.machine}: All parameters within limits.`,
        department,
        machine: record.machine,
        timestamp: new Date().toISOString(),
        acknowledged: true,
        icon: '🟢'
      });
    }

    if (newAlerts.length > 0) {
      this.alerts.unshift(...newAlerts);
      this.saveAlerts();
      this.notifyListeners();
    }
  },

  // Get active (unacknowledged) alerts
  getActiveAlerts() {
    return this.alerts.filter(a => !a.acknowledged && a.type !== 'normal');
  },

  // Get all alerts
  getAllAlerts() {
    return this.alerts;
  },

  // Acknowledge an alert
  acknowledge(id) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
      this.notifyListeners();
    }
  },

  // Clear all alerts
  clearAll() {
    this.alerts = [];
    this.saveAlerts();
    this.notifyListeners();
  },

  // Check for stale alerts
  checkStaleAlerts() {
    const now = Date.now();
    this.alerts = this.alerts.filter(a => {
      if (a.acknowledged) return true;
      const age = now - new Date(a.timestamp).getTime();
      return age < 86400000; // Keep alerts for 24 hours
    });
    this.saveAlerts();
  },

  // Subscribe to alert changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notifyListeners() {
    this.listeners.forEach(l => l(this.alerts));
  },

  // Persist alerts
  saveAlerts() {
    try {
      localStorage.setItem('texgauge_alerts', JSON.stringify(this.alerts.slice(0, 200)));
    } catch (e) {}
  },

  loadAlerts() {
    try {
      const data = localStorage.getItem('texgauge_alerts');
      if (data) this.alerts = JSON.parse(data);
    } catch (e) {
      this.alerts = [];
    }
  },

  // Get alert counts
  getCounts() {
    const active = this.getActiveAlerts();
    return {
      critical: active.filter(a => a.type === 'critical').length,
      warning: active.filter(a => a.type === 'warning').length,
      total: active.length
    };
  }
};

// Initialize
AlertSystem.init();