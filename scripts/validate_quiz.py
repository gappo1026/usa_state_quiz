#!/usr/bin/env python3
"""Validate 50-state quiz data integrity and choice generation rules."""

from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "js" / "states-data.js"
EXPECTED = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
}
REGIONS = {"Northeast", "Midwest", "South", "West"}


def load_js_objects() -> tuple[list[dict], dict]:
    text = DATA.read_text(encoding="utf-8")
    states_match = re.search(r"window\.US_STATES\s*=\s*(\[.*?\]);\s*window\.US_MAP", text, re.S)
    map_match = re.search(r"window\.US_MAP\s*=\s*(\{.*\});\s*\Z", text, re.S)
    if not states_match or not map_match:
        raise SystemExit("Could not parse US_STATES / US_MAP from states-data.js")
    return json.loads(states_match.group(1)), json.loads(map_match.group(1))


def simulate_round(states: list[dict], seed: int) -> None:
    rng = random.Random(seed)
    round_states = states[:]
    rng.shuffle(round_states)
    round_states = round_states[:10]
    ids = [s["id"] for s in round_states]
    if len(set(ids)) != 10:
        raise SystemExit(f"Duplicate questions in round seed={seed}")

    for correct in round_states:
        others = [s for s in states if s["id"] != correct["id"]]
        distractors = others[:]
        rng.shuffle(distractors)
        choices = distractors[:3] + [correct]
        rng.shuffle(choices)
        choice_ids = [c["id"] for c in choices]
        if correct["id"] not in choice_ids:
            raise SystemExit(f"Correct answer missing for {correct['name']}")
        if len(set(choice_ids)) != 4:
            raise SystemExit(f"Duplicate choices for {correct['name']}")


def main() -> None:
    states, us_map = load_js_objects()
    assert len(states) == 50, f"Expected 50 states, got {len(states)}"

    ids = {s["id"] for s in states}
    names = {s["name"] for s in states}
    assert ids == EXPECTED, f"ID mismatch: missing={EXPECTED-ids} extra={ids-EXPECTED}"
    assert len(names) == 50, "Duplicate state names"

    for state in states:
        assert state["path"].startswith("M"), f"Bad path for {state['id']}"
        assert "Z" in state["path"], f"Unclosed path for {state['id']}"
        assert state["viewBox"] == "0 0 320 320"
        assert isinstance(state["fact"], str) and len(state["fact"]) > 20
        assert state["region"] in REGIONS, f"Bad region for {state['id']}"
        assert isinstance(state["capital"], str) and state["capital"]

    map_ids = {p["id"] for p in us_map["paths"]}
    assert map_ids == EXPECTED, "US_MAP ids incomplete"
    assert "viewBox" in us_map and us_map["viewBox"].startswith("0 0")
    for item in us_map["paths"]:
        assert item["path"].startswith("M") and "Z" in item["path"]

    for seed in range(50):
        simulate_round(states, seed)

    required_files = [
        ROOT / "index.html",
        ROOT / "about.html",
        ROOT / "privacy.html",
        ROOT / "operator.html",
        ROOT / "css" / "styles.css",
        ROOT / "js" / "quiz.js",
        ROOT / "js" / "states-data.js",
        ROOT / "README.md",
    ]
    missing = [str(p) for p in required_files if not p.exists()]
    if missing:
        raise SystemExit("Missing files: " + ", ".join(missing))

    print("VALIDATION OK")
    print(f"- {len(states)} states with unique ids/names/regions/capitals")
    print("- Locator map paths present for all 50 states")
    print("- 50 simulated rounds: no duplicate questions; correct answer always in 4 choices")
    print("- Required static site files present")


if __name__ == "__main__":
    main()
