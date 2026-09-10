#!/usr/bin/env python3
"""Milestone 1 stub: prints a hardcoded fake ride response."""

import json

DUMMY_RESPONSE = {
    "status": "ok",
    "message": "Ride requested for your barber.",
    "driver": "Carlos",
    "vehicle": "Toyota Corolla, plate ABC-1234",
    "eta_minutes": 4,
}

if __name__ == "__main__":
    print(json.dumps(DUMMY_RESPONSE, indent=2))
