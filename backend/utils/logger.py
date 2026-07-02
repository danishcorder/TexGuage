"""
TexGauge IQ - Professional Rotating Logger
===========================================
Provides rotating file logging with daily rotation,
configurable levels, and structured log format.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional


LOG_DIR = Path(__file__).parent.parent / "logs"


class ScaleLogger:
    """
    Centralized logging service with rotating file handlers.
    Logs are stored in the backend/logs/ directory.
    """

    _instances: dict = {}
    _initialized = False

    def __init__(
        self,
        name: str = "texgauge",
        level: str = "INFO",
        log_dir: Optional[str] = None,
        max_bytes: int = 10_485_760,
        backup_count: int = 10,
    ):
        self.logger = logging.getLogger(name)
        if self.logger.handlers:
            return

        log_path = Path(log_dir) if log_dir else LOG_DIR
        log_path.mkdir(parents=True, exist_ok=True)

        numeric_level = getattr(logging, level.upper(), logging.INFO)
        self.logger.setLevel(numeric_level)

        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        # File handler with rotation
        file_handler = RotatingFileHandler(
            filename=str(log_path / f"{name}.log"),
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(numeric_level)
        self.logger.addHandler(file_handler)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(numeric_level)
        self.logger.addHandler(console_handler)

    def debug(self, msg, *args, **kwargs):
        self.logger.debug(msg, *args, **kwargs)

    def info(self, msg, *args, **kwargs):
        self.logger.info(msg, *args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        self.logger.warning(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        self.logger.error(msg, *args, **kwargs)

    def critical(self, msg, *args, **kwargs):
        self.logger.critical(msg, *args, **kwargs)

    def get_recent_logs(self, lines: int = 100) -> list:
        """Retrieve the most recent log lines from the file."""
        log_file = LOG_DIR / "texgauge.log"
        if not log_file.exists():
            return []
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                all_lines = f.readlines()
            recent = all_lines[-lines:]
            return [
                {
                    "timestamp": line[:19],
                    "level": line[22:30].strip(),
                    "logger": line[33:].split("|")[0].strip() if "|" in line else "",
                    "message": line.split("|")[-1].strip() if "|" in line else line.strip(),
                }
                for line in recent
                if line.strip()
            ]
        except (OSError, IndexError):
            return []


def get_logger(name: str = "texgauge") -> ScaleLogger:
    """Get or create a ScaleLogger instance."""
    from backend.config import config

    log_cfg = config.get_all().get("logging", {})
    return ScaleLogger(
        name=name,
        level=log_cfg.get("level", "INFO"),
        max_bytes=log_cfg.get("max_bytes", 10_485_760),
        backup_count=log_cfg.get("backup_count", 10),
    )