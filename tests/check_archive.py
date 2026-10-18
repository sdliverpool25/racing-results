#!/usr/bin/env python3
"""Lock the personal-best rule against data/races.json."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RACES = json.loads((ROOT / "data" / "races.json").read_text(encoding="utf-8"))

EXPECTED = {
    "5K": ("0:21:59", "2026-04-11", "Galup Reserve parkrun #73"),
    "12K": ("0:58:00", "2025-08-31", "City to Surf 12km"),
    "Trail": ("1:09:00", "2020-12-06", "Stay Puft"),
    "Sprint": ("1:17:00", "2025-01-12", "Interclubs"),
    "Half Marathon": ("1:44:00", "2025-08-03", "Perth Half Marathon"),
    "Swim 5K": ("1:53:00", "2025-11-22", "OWS coogee 5k."),
    "Bike Time Trial": ("2:22:00", "2024-03-24", "ATTA Time Trial"),
    "Olympic": ("2:32:00", "2024-04-14", "Mullaloo Olympic Tri"),
    "Ultra": ("2:58:00", "2025-08-24", "Perth 32"),
    "Gran Fondo": ("3:44:00", "2020-09-13", "Canola Classic 94km"),
    "Marathon": ("3:55:00", "2025-10-12", "Perth City Marathon"),
    "Swim 10K": ("4:18:00", "2025-12-21", "Christmas 10km"),
    "T100": ("4:52:00", "2026-05-03", "Busso 100"),
    "70.3": ("5:26:00", "2024-09-08", "Sunshine Coast 70.3"),
    "Ironman": ("11:08:00", "2024-12-01", "IM Western Australia"),
}


def placeholder(race):
    name = (race.get("race_name") or "").strip()
    return not name or name.upper() == "COVID YEAR"


def main():
    assert len(RACES) == 81, len(RACES)
    real = [race for race in RACES if not placeholder(race)]
    hidden = [race for race in RACES if placeholder(race)]
    assert len(real) == 79, len(real)
    parkruns = [race for race in real if race.get("event_type") == "parkrun" or race.get("race_category") == "parkrun"]
    assert len(parkruns) == 22, len(parkruns)
    assert all(race.get("discipline") == "Run" and race.get("distance") == "5K" for race in parkruns)
    assert len(hidden) == 2
    assert any(not (race.get("race_name") or "").strip() for race in hidden)
    assert any((race.get("race_name") or "").upper() == "COVID YEAR" for race in hidden)

    best = {}
    for race in real:
        if race.get("finish_seconds") is None or not race.get("distance"):
            continue
        current = best.get(race["distance"])
        if current is None or race["finish_seconds"] < current["finish_seconds"]:
            best[race["distance"]] = race

    assert set(best) == set(EXPECTED)
    for distance, (finish, date, name) in EXPECTED.items():
        race = best[distance]
        assert race["finish_time"] == finish, (distance, race["finish_time"])
        assert race["date"] == date, (distance, race["date"])
        assert race["race_name"] == name, (distance, race["race_name"])

    iron = best["Ironman"]
    assert (iron["swim"], iron["bike"], iron["run"]) == ("1:18:00", "5:30:00", "4:07:00")
    half = best["70.3"]
    assert (half["swim"], half["bike"], half["run"]) == ("0:37:00", "2:39:00", "2:03:00")
    five = best["5K"]
    assert "61.18% age grade" in (five.get("position") or "")
    print("archive ok: 79 races, 15 personal bests, 22 parkruns")


if __name__ == "__main__":
    main()
