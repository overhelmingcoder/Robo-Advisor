import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "schemes_data.json"

with open(DATA_PATH) as f:
    SCHEMES: list[dict] = json.load(f)


def find_scheme(scheme_id: str) -> dict | None:
    return next((s for s in SCHEMES if s["scheme_id"] == scheme_id), None)

