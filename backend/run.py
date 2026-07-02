#!/usr/bin/env python3
"""
TexGauge IQ - Backend Runner
=============================
Simple script to start the backend server.
Usage: python run.py
"""

import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import run

if __name__ == "__main__":
    run()