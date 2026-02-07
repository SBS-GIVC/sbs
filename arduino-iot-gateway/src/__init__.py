"""
BrainSAIT Arduino IoT Gateway Module
=====================================
Bridges Arduino devices to BrainSAIT SBS Cloud API.

Domains:
- Landing: https://brainsait.cloud
- App: https://sbs.brainsait.cloud
- IoT API: https://sbs.brainsait.cloud/api/v1/iot/events
"""

__version__ = "1.1.0"
__author__ = "BrainSAIT Team"

from .serial_gateway import ArduinoCloudConnector, GatewayConfig

__all__ = ["ArduinoCloudConnector", "GatewayConfig"]
