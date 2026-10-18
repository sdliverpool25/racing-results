#!/usr/bin/env python3
"""Rewrite data/races.json from the Racing Results Airtable base.

The site never calls Airtable. Run this locally when the table changes:

    export AIRTABLE_TOKEN="pat..."   # personal access token, data.records:read
    python3 scripts/refresh_from_airtable.py

Base app3YvIK7HbQSRz9F, table tblY7mO0TnClARyfZ (Race Results).
The token is read from the environment and is not written into the repo.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_ID = "app3YvIK7HbQSRz9F"
TABLE_ID = "tblY7mO0TnClARyfZ"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "races.json"

# Airtable field name -> key used by the static site.
FIELDS = (
    ("Race name", "race_name"),
    ("Date", "date"),
    ("Discipline", "discipline"),
    ("Distance", "distance"),
    ("Distance km", "distance_km"),
    ("Distance (original)", "distance_original"),
    ("Event type", "event_type"),
    ("Race category", "race_category"),
    ("Finish time", "finish_time"),
    ("Finish seconds", "finish_seconds"),
    ("Swim", "swim"),
    ("T1", "t1"),
    ("Bike", "bike"),
    ("T2", "t2"),
    ("Run", "run"),
    ("Location", "location"),
    ("Position / placing", "position"),
    ("Notes", "notes"),
    ("Link", "link"),
    ("Strava bike link", "strava_bike"),
    ("Strava bike label", "strava_bike_label"),
    ("Notion title", "notion_title"),
    ("Raw times", "raw_times"),
    ("Notion page", "notion_page"),
    ("Data issues", "data_issues"),
)

INTEGER_KEYS = {"finish_seconds"}


def scalar(value):
    """Airtable's REST API returns select names as strings. Accept {name: ...} too."""
    if isinstance(value, dict) and "name" in value:
        return value["name"]
    return value


def clean(key, value):
    value = scalar(value)
    if value is None or value == "":
        return None
    if key in INTEGER_KEYS and isinstance(value, (int, float)):
        return int(value)
    return value


def to_race(record):
    fields = record.get("fields") or {}
    return {key: clean(key, fields.get(label)) for label, key in FIELDS}


def sort_key(race):
    return (race["date"] is None, race["date"] or "", (race["race_name"] or "").lower())


def fetch_records(token):
    records = []
    offset = None
    while True:
        query = {"pageSize": "100"}
        if offset:
            query["offset"] = offset
        url = "https://api.airtable.com/v0/%s/%s?%s" % (
            BASE_ID,
            TABLE_ID,
            urllib.parse.urlencode(query),
        )
        request = urllib.request.Request(
            url,
            headers={"Authorization": "Bearer " + token, "User-Agent": "racing-results-refresh"},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            raise SystemExit("Airtable returned HTTP %s.\n%s" % (error.code, detail)) from error
        records.extend(payload.get("records") or [])
        offset = payload.get("offset")
        if not offset:
            return records


def write_races(records):
    races = sorted((to_race(record) for record in records), key=sort_key)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(races, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return races


def self_test():
    race = to_race(
        {
            "id": "recTESTRECORD0001",
            "fields": {
                "Race name": "IM Western Australia",
                "Date": "2024-12-01",
                "Discipline": {"name": "Ironman"},
                "Distance": "Ironman",
                "Finish time": "11:08:00",
                "Finish seconds": 40080.0,
                "Swim": "1:18:00",
                "Notes": "",
            },
        }
    )
    assert race["race_name"] == "IM Western Australia"
    assert race["discipline"] == "Ironman"
    assert race["finish_seconds"] == 40080
    assert race["swim"] == "1:18:00"
    assert race["notes"] is None
    assert race["data_issues"] is None
    ordered = sorted(
        [
            {"date": None, "race_name": "Empty"},
            {"date": "2020-01-01", "race_name": "COVID YEAR"},
            {"date": "2013-08-18", "race_name": "Leinster Loop"},
        ],
        key=sort_key,
    )
    assert [row["race_name"] for row in ordered] == ["Leinster Loop", "COVID YEAR", "Empty"]
    print("self-test ok")


def main(argv):
    if "--self-test" in argv:
        self_test()
        return 0
    token = os.environ.get("AIRTABLE_TOKEN", "").strip()
    if not token:
        print("Set AIRTABLE_TOKEN to an Airtable personal access token with read access to this base.", file=sys.stderr)
        print("Example: export AIRTABLE_TOKEN='pat...' && python3 scripts/refresh_from_airtable.py", file=sys.stderr)
        return 2
    records = fetch_records(token)
    races = write_races(records)
    print("Wrote %s records to %s" % (len(races), OUT.relative_to(ROOT)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
