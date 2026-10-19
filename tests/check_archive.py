#!/usr/bin/env python3
"""Lock the v2 data files (Notion export) and the personal-best rule."""

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RACES = json.loads((ROOT / "data" / "races.json").read_text(encoding="utf-8"))
ACTS = json.loads((ROOT / "data" / "activities.json").read_text(encoding="utf-8"))
AGG = json.loads((ROOT / "data" / "aggregates.json").read_text(encoding="utf-8"))
STRAVA_SOURCE = "Strava (added 19 Oct 2026)"

# Personal bests come from official results only (source != Strava-detected races).
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
    "Swim 10K": ("4:18:00", "2025-12-20", "Christmas 10km"),  # date corrected from 2025-12-21
    "T100": ("4:52:00", "2026-05-03", "Busso 100"),
    "70.3": ("5:26:00", "2024-09-08", "Sunshine Coast 70.3"),
    "Ironman": ("11:08:00", "2024-12-01", "IM Western Australia"),
}
V1_KEYS = {
    "race_name", "date", "discipline", "distance", "distance_km", "distance_original", "event_type",
    "race_category", "finish_time", "finish_seconds", "swim", "t1", "bike", "t2", "run", "location",
    "position", "notes", "link", "strava_bike", "strava_bike_label", "notion_title", "raw_times",
    "notion_page", "data_issues",
}


def personal_bests(races):
    best = {}
    for race in races:
        if race.get("finish_seconds") is None or not race.get("distance"):
            continue
        current = best.get(race["distance"])
        if current is None or race["finish_seconds"] < current["finish_seconds"]:
            best[race["distance"]] = race
    return best


def check_races():
    assert len(RACES) == 97, len(RACES)
    for race in RACES:
        assert V1_KEYS <= set(race), set(race) ^ V1_KEYS
        assert race["id"] and race["source"] and isinstance(race["strava_activity_ids"], list)
        assert (race.get("race_name") or "").strip() and race["race_name"].upper() != "COVID YEAR"
    assert len({race["id"] for race in RACES}) == 97
    assert Counter(race["source"] for race in RACES) == {"Notion": 57, "parkrun": 22, STRAVA_SOURCE: 18}
    keys = [(race["date"] is None, race["date"] or "", race["race_name"].lower()) for race in RACES]
    assert keys == sorted(keys)
    parkruns = [r for r in RACES if r.get("event_type") == "parkrun" or r.get("race_category") == "parkrun"]
    assert len(parkruns) == 22, len(parkruns)
    assert all(r.get("discipline") == "Run" and r.get("distance") == "5K" for r in parkruns)

    official = [race for race in RACES if race["source"] != STRAVA_SOURCE]
    best = personal_bests(official)
    assert set(best) == set(EXPECTED), set(best) ^ set(EXPECTED)
    for distance, (finish, date, name) in EXPECTED.items():
        race = best[distance]
        assert (race["finish_time"], race["date"], race["race_name"]) == (finish, date, name), (distance, race)
    iron, half = best["Ironman"], best["70.3"]
    assert (iron["swim"], iron["bike"], iron["run"]) == ("1:18:00", "5:30:00", "4:07:00")
    assert (half["swim"], half["bike"], half["run"]) == ("0:37:00", "2:39:00", "2:03:00")
    assert "61.18% age grade" in (best["5K"].get("position") or "")
    # Strava-detected races carry elapsed times, not official results. Counting them would
    # (wrongly) move only the Trail PB, to the 9.98 km Walyunga run.
    moved = {k: v["race_name"] for k, v in personal_bests(RACES).items() if v is not best.get(k)}
    assert moved == {"Trail": "Perth Trail Series (blue) - Walyunga"}, moved
    return best


def check_activities():
    fields = ACTS["fields"]
    rows = [dict(zip(fields, row)) for row in ACTS["rows"]]
    assert len(rows) == 1976 and all(len(r) == len(fields) for r in ACTS["rows"])
    assert len({r["id"] for r in rows}) == 1976
    forbidden = {"description", "start_utc", "start", "time", "utc"}
    assert not forbidden & set(fields)
    assert all(r["hour"] is None or 0 <= r["hour"] <= 23 for r in rows)
    assert all(len(r["date"]) == 10 for r in rows)
    assert sum(r["dup"] for r in rows) == 4
    race_ids = {race["id"] for race in RACES}
    linked = [r for r in rows if r["race_id"]]
    assert len(linked) == 157 and all(r["race_id"] in race_ids for r in linked)
    from_races = {(race["id"], a) for race in RACES for a in race["strava_activity_ids"]}
    assert from_races == {(r["race_id"], r["id"]) for r in linked}
    no_acts = sorted(race["race_name"] for race in RACES if not race["strava_activity_ids"])
    assert no_acts == ["Jolly Jumbuck", "Sunsmart Series Whitford Nodes Sprint", "Yokine parkrun #50"], no_acts
    return rows


def check_aggregates(rows):
    real = [r for r in rows if not r["dup"]]
    assert AGG["meta"]["activities"] == len(real) == 1972
    for period in ("weekly", "monthly", "yearly"):
        table = AGG[period]
        assert table["fields"] == ["period", "type", "count", "km", "hours"]
        total = sum(row[2] for row in table["rows"] if row[1] == "All")
        assert total == len(real), (period, total)
    km = sum(r["km"] or 0 for r in real)
    assert abs(sum(row[3] for row in AGG["yearly"]["rows"] if row[1] == "All") - km) < 0.1
    bests = {row["label"]: row for row in AGG["run_bests"]["rows"]}
    assert set(bests) == {"5k", "10k", "21.1k", "42.2k"}
    by_id = {r["id"]: r for r in real}
    for label, row in bests.items():
        act = by_id[row["activity_id"]]
        assert act["type"] == "Run" and act["km"] >= row["min_km"]
        assert act["moving_s"] / act["km"] >= AGG["run_bests"]["min_plausible_pace_s"]


def check_pages():
    """The static pages have to apply the same personal-best rule as this file."""
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    training_js = (ROOT / "training.js").read_text(encoding="utf-8")
    training = (ROOT / "training.html").read_text(encoding="utf-8")
    reports = (ROOT / "reports.js").read_text(encoding="utf-8")
    archive = (ROOT / "archive.js").read_text(encoding="utf-8")
    assert "function officialResult" in app
    assert STRAVA_SOURCE in app
    assert "from Strava" in app
    assert "strava_activity_ids" in app
    assert "show-hidden" not in index and "Show placeholder" not in index
    assert "training.html" in index and "reports.html" in index
    assert 'id="source"' in index
    assert "whole-activity pace" in training_js
    assert "run_bests" in training_js and "dup" in archive
    assert "Race days only" in training
    for key in ("metric", "group", "sport", "from", "to", "chart"):
        assert key in reports
    assert "text/csv" in reports
    assert "URLSearchParams" in reports


def main():
    check_races()
    rows = check_activities()
    check_aggregates(rows)
    check_pages()
    print("archive ok: 97 races (18 from Strava), 15 personal bests, 22 parkruns; "
          "1976 activities, 157 race links; aggregates consistent; pages exclude Strava elapsed times from bests")


if __name__ == "__main__":
    main()
