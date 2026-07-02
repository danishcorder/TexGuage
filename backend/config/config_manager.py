"""
TexGauge IQ - Configuration Manager
====================================
Manages application configuration with JSON persistence,
environment variable overrides, and runtime updates.
"""

import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional


class ConfigManager:
    """
    Thread-safe configuration manager with JSON file persistence.
    Supports runtime updates and automatic file saving.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, config_path: Optional[str] = None):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True

        self._config_path = config_path or str(
            Path(__file__).parent / "config.json"
        )
        self._config: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._load()

    def _load(self) -> None:
        """Load configuration from JSON file."""
        try:
            path = Path(self._config_path)
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    self._config = json.load(f)
            else:
                self._config = self._defaults()
                self._save()
        except (json.JSONDecodeError, OSError) as e:
            print(f"Config load error: {e}. Using defaults.")
            self._config = self._defaults()

    def _save(self) -> None:
        """Save configuration to JSON file."""
        try:
            path = Path(self._config_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=2)
        except OSError as e:
            print(f"Config save error: {e}")

    @staticmethod
    def _defaults() -> Dict[str, Any]:
        """Return default configuration."""
        return {
            "serial": {
                "port": None,
                "baud_rate": 9600,
                "data_bits": 8,
                "stop_bits": 1,
                "parity": "none",
                "timeout": 2.0,
                "auto_reconnect": True,
                "reconnect_interval": 3.0,
                "max_retries": 10,
                "exponential_backoff": True,
            },
            "scale": {
                "brand": "generic",
                "units": "grams",
                "weight_min": 0.1,
                "weight_max": 1000.0,
                "stable_threshold": 0.05,
                "read_interval": 0.05,
            },
            "websocket": {
                "heartbeat_interval": 5.0,
                "broadcast_interval": 0.05,
            },
            "logging": {
                "level": "INFO",
                "max_bytes": 10_485_760,
                "backup_count": 10,
                "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            },
            "server": {
                "host": "0.0.0.0",
                "port": 8000,
                "reload": False,
                "cors_origins": ["*"],
            },
        }

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a config value using dot notation.
        Example: config.get("serial.baud_rate")
        """
        with self._lock:
            parts = key.split(".")
            value = self._config
            for part in parts:
                if isinstance(value, dict):
                    value = value.get(part)
                    if value is None:
                        return default
                else:
                    return default
            return value

    def set(self, key: str, value: Any) -> None:
        """
        Set a config value using dot notation.
        Example: config.set("serial.baud_rate", 9600)
        """
        with self._lock:
            parts = key.split(".")
            target = self._config
            for part in parts[:-1]:
                if part not in target:
                    target[part] = {}
                target = target[part]
            target[parts[-1]] = value
            self._save()

    def get_all(self) -> Dict[str, Any]:
        """Return entire configuration dict."""
        with self._lock:
            return dict(self._config)

    def update(self, updates: Dict[str, Any]) -> None:
        """
        Update multiple config values at once using dot-notated keys.
        Example: update({"serial.baud_rate": 115200, "scale.brand": "ohaus"})
        """
        with self._lock:
            for key, value in updates.items():
                parts = key.split(".")
                target = self._config
                for part in parts[:-1]:
                    if part not in target:
                        target[part] = {}
                    target = target[part]
                target[parts[-1]] = value
            self._save()

    def reset(self) -> None:
        """Reset configuration to defaults."""
        with self._lock:
            self._config = self._defaults()
            self._save()