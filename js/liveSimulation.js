// ============================================================
// TexGauge IQ - Real-Time Simulation Engine
// Generates realistic mill data when Live Mode is ON
// ============================================================

const LiveSimulation = {
  isRunning: false,
  interval: null,
  speed: 3000, // ms between data points
  departments: ['Carding', 'Breaker', 'Finisher', 'Simplex'],
  
  // Machine configurations per department
  machines: {
    Carding: ['C1','C2','C3','C4','C5','C6','C7','C8','C9','C10'],
    Breaker: ['B1','B2','B3','B4','B5','B6','B7','B8'],
    Finisher: ['F1','F2','F3','F4','F5','F6'],
    Simplex: ['S1','S2','S3','S4','S5','S6']
  },

  // G/Y% targets per department
  targets: {
    Carding: { min: 109, max: 111 },
    Breaker: { min: 78.5, max: 81.5 },
    Finisher: { min: 74.50, max: 74.95 },
    Simplex: { min: 109, max: 111 }
  },

  listeners: [],

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.notifyListeners('started');

    this.interval = setInterval(() => this.generateData(), this.speed);
    // Generate first batch immediately
    this.generateData();
  },

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.notifyListeners('stopped');
  },

  toggle() {
    if (this.isRunning) this.stop();
    else this.start();
  },

  generateData() {
    // Exclude Carding from simulation - Carding uses real scale only
    const availableDepts = this.departments.filter(d => d !== 'Carding');
    const dept = availableDepts[Math.floor(Math.random() * availableDepts.length)];
    const machines = this.machines[dept];
    const machine = machines[Math.floor(Math.random() * machines.length)];
    const target = this.targets[dept];

    // Generate realistic sample values
    const sampleCount = 2 + Math.floor(Math.random() * 4); // 2-6 samples
    const samples = [];
    const baseWeight = 100 + Math.random() * 30;
    for (let i = 0; i < 6; i++) {
      if (i < sampleCount) {
        const variation = (Math.random() - 0.5) * 6;
        samples.push(round(baseWeight + variation, 2));
      } else {
        samples.push(0); // empty
      }
    }

    // Calculate values
    const validSamples = samples.filter(s => s > 0);
    const mean = round(average(validSamples));
    const sd = validSamples.length > 1 ? round(standardDeviation(validSamples)) : 0;
    const cv = round(cvPercent(validSamples));

    let gValue;
    if (dept === 'Simplex') {
      gValue = round(hankRovingValue(mean, 1), 3);
    } else {
      const targetGrams = 110;
      gValue = round(gyPercent(mean, targetGrams), 2);
    }

    // Simulate some out-of-control values occasionally
    const isBad = Math.random() < 0.15; // 15% chance of rejection
    const gMin = isBad ? (target.min + 5) : target.min;
    const gMax = isBad ? (target.max - 5) : target.max;

    const status = evaluateRange(gValue, gMin, gMax);
    const shifts = ['Day', 'Night'];
    const shift = shifts[Math.floor(Math.random() * shifts.length)];
    const operators = ['Ali', 'Usman', 'Ahmed', 'Bilal', 'Kamran', 'Tahir'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    const record = {
      date: new Date().toISOString().slice(0, 10),
      shift,
      machine,
      operator,
      samples,
      sampleCount: validSamples.length,
      average: mean,
      sd,
      cv,
      g: gValue,
      status: status.status,
      targetWeight: 110,
      count: dept === 'Simplex' ? round(Math.random() * 0.5 + 0.1, 3) : undefined
    };

    this.notifyListeners('data', { department: dept, record });

    // Save to localStorage
    const storageKey = `spinning_mill_${dept.toLowerCase()}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.unshift(record);
    localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 500))); // keep last 500

    // Evaluate alerts
    AlertSystem.evaluate(record, dept);
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notifyListeners(event, data) {
    this.listeners.forEach(l => l(event, data));
  }
};