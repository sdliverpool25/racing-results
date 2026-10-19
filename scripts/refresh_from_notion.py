#!/usr/bin/env python3
"""Rebuild data/races.json, data/activities.json and data/aggregates.json from Notion.

The site never calls Notion. Run this locally (or in CI) when the databases change:

    export NOTION_TOKEN="ntn_..."    # internal integration token, read content only
    python3 scripts/refresh_from_notion.py

Source databases (under "Racing Results" > "Training & Racing Data"):
  Races            b4eccfb740f14f9f80446d62f0a718ad
  Strava Activities e45f7016dea94d3ba1af2ad2d5e1ca00
Share both databases with the integration (••• > Connections) or the API returns 404.
Override the IDs with NOTION_RACES_DB / NOTION_ACTIVITIES_DB if they ever move.

Only the Python standard library is used. The token is read from the environment
and is never written into the repo.

Privacy: the site is public. Activity descriptions, UTC timestamps and exact start
times are deliberately NOT exported; activities carry a local date and local start hour.

Other modes:
    python3 scripts/refresh_from_notion.py --self-test
        Run the transform on a built-in fixture (no network) and check the output.
    python3 scripts/refresh_from_notion.py --from-flat races.json activities.json
        Build from already-flattened rows ({"_id": page_id, "<Property>": value, ...});
        useful for debugging without a token.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

try:
    from zoneinfo import ZoneInfo  # Windows: pip install tzdata
except ImportError:  # pragma: no cover
    ZoneInfo = None

RACES_DB = os.environ.get("NOTION_RACES_DB", "b4eccfb740f14f9f80446d62f0a718ad")
ACTIVITIES_DB = os.environ.get("NOTION_ACTIVITIES_DB", "e45f7016dea94d3ba1af2ad2d5e1ca00")
WALLCLOCK_TZ = os.environ.get("NOTION_WALLCLOCK_TZ", "Europe/Dublin")
NOTION_VERSION = "2022-06-28"
API = "https://api.notion.com/v1"

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

STRAVA_URL = "https://www.strava.com/activities/{id}"
STRAVA_RACE_SOURCE = "Strava (added 19 Oct 2026)"

# Notion property -> races.json key (same keys the v1 site already reads).
RACE_FIELDS = (
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
    ("Position", "position"),
    ("Notes", "notes"),
    ("Link", "link"),
    ("Strava bike link", "strava_bike"),
    ("Strava bike label", "strava_bike_label"),
    ("Notion title", "notion_title"),
    ("Raw times", "raw_times"),
    ("Notion page", "notion_page"),
    ("Data issues", "data_issues"),
)

# activities.json is row-oriented with a field list (see README "Data files").
ACTIVITY_FIELDS = (
    "id", "date", "hour", "name", "type", "km", "moving_s", "elapsed_s", "elev_m",
    "avg_hr", "max_hr", "avg_watts", "weighted_watts", "cadence", "calories",
    "relative_effort", "race_id", "dup",
)
ACTIVITY_PROPS = {
    "km": "Distance km", "moving_s": "Moving s", "elapsed_s": "Elapsed s",
    "elev_m": "Elevation gain m", "avg_hr": "Avg HR", "max_hr": "Max HR",
    "avg_watts": "Avg watts", "weighted_watts": "Weighted avg watts",
    "cadence": "Avg cadence", "calories": "Calories", "relative_effort": "Relative effort",
}
INT_KEYS = {"moving_s", "elapsed_s", "avg_hr", "max_hr", "avg_watts", "weighted_watts",
            "calories", "relative_effort", "finish_seconds"}
PB_RUN_TYPES = {"Run"}
PB_THRESHOLDS = ((5.0, "5k"), (10.0, "10k"), (21.1, "21.1k"), (42.2, "42.2k"))
# Whole-activity paces faster than this are GPS glitches / uncalibrated treadmills, not efforts.
MIN_PLAUSIBLE_PACE_S = int(os.environ.get("MIN_PLAUSIBLE_PACE_S", "240"))  # 4:00/km


# --------------------------------------------------------------------------- Notion API
def _request(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    })
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(float(err.headers.get("Retry-After") or 2 ** attempt))
                continue
            detail = err.read().decode(errors="replace")
            raise SystemExit(f"Notion API {err.code} on {path}: {detail}") from None
        except urllib.error.URLError:
            if attempt < 5:
                time.sleep(2 ** attempt)
                continue
            raise


def query_database(db_id, token):
    pages, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        res = _request("POST", f"/databases/{db_id}/query", token, body)
        pages.extend(res["results"])
        if not res.get("has_more"):
            return pages
        cursor = res["next_cursor"]


def page_property(page_id, prop_id, token):
    """Fetch a full relation list when a page has more than 25 links."""
    out, cursor = [], None
    while True:
        q = f"?start_cursor={cursor}" if cursor else ""
        res = _request("GET", f"/pages/{page_id}/properties/{prop_id}{q}", token)
        out.extend(r["relation"]["id"] for r in res.get("results", []))
        if not res.get("has_more"):
            return out
        cursor = res["next_cursor"]


def _plain(rich):
    """Rich text -> string; linked runs become [text](url) so app.js appendRich() can link them."""
    out = []
    for part in rich or []:
        text, href = part.get("plain_text", ""), part.get("href")
        out.append(f"[{text}]({href})" if href and text and text != href else text)
    return "".join(out) or None


def flatten(page, token=None):
    """Notion page -> {"_id": id, "<Property>": python value}."""
    row = {"_id": norm_id(page["id"])}
    for name, prop in page["properties"].items():
        kind = prop["type"]
        val = prop.get(kind)
        if kind in ("title", "rich_text"):
            val = _plain(val)
        elif kind == "select":
            val = val["name"] if val else None
        elif kind == "multi_select":
            val = [v["name"] for v in val]
        elif kind == "date":
            val = val["start"] if val else None
        elif kind == "relation":
            ids = [r["id"] for r in val]
            if prop.get("has_more") and token:
                ids = page_property(page["id"], prop["id"], token)
            val = [norm_id(i) for i in ids]
        elif kind == "checkbox":
            val = bool(val)
        elif kind == "formula":
            val = val.get(val.get("type")) if val else None
        elif kind not in ("number", "url", "email", "phone_number"):
            continue
        row[name] = val
    return row


# --------------------------------------------------------------------------- transform
def norm_id(page_id):
    return (page_id or "").replace("-", "").lower()


def blank(v):
    return None if v is None or v == "" or v == [] else v


def num(v, key=None):
    v = blank(v)
    if v is None:
        return None
    if key in INT_KEYS:
        return int(round(float(v)))
    f = float(v)
    return int(f) if f.is_integer() and key not in ("km", "distance_km", "elev_m") else round(f, 3)


def _parse(ts):
    return dt.datetime.fromisoformat(str(ts).strip().replace(" ", "T").replace("Z", "+00:00"))


def local_date_hour(row):
    """Local date and start hour of an activity; nothing finer is exported.

    Preferred: the "Start UTC" property converted to the activity's "Time zone" property.
    Fallback: the "Date" property. Notion keeps a time entered without a zone as an instant in
    the workspace owner's zone and the API returns it in UTC, so an offset-bearing value is
    converted back to NOTION_WALLCLOCK_TZ (default Europe/Dublin) to recover the wall clock.
    """
    utc, tz = blank(row.get("Start UTC")), blank(row.get("Time zone"))
    if utc and tz and ZoneInfo:
        try:
            local = _parse(utc).astimezone(ZoneInfo(tz))
            return local.date().isoformat(), local.hour
        except (ValueError, KeyError):
            pass
    start = blank(row.get("Date"))
    if not start:
        return None, None
    s = str(start)
    if len(s) <= 10:
        return s[:10], None
    when = _parse(s)
    if when.tzinfo is not None and ZoneInfo:
        when = when.astimezone(ZoneInfo(WALLCLOCK_TZ))
    return when.date().isoformat(), when.hour


def build_races(race_rows, activity_by_page):
    races = []
    for row in race_rows:
        r = {}
        for prop, key in RACE_FIELDS:
            v = blank(row.get(prop))
            if key == "date" and v:
                v = str(v)[:10]
            elif key in ("distance_km", "finish_seconds"):
                v = num(v, key)
            r[key] = v
        r["id"] = blank(row.get("Race key")) or row["_id"]
        r["source"] = blank(row.get("Source"))
        acts = [activity_by_page[p] for p in row.get("Strava activities") or [] if p in activity_by_page]
        acts.sort(key=lambda a: (a["date"] or "", a["hour"] or 0, a["id"]))
        r["strava_activity_ids"] = [a["id"] for a in acts]
        races.append(r)
    races.sort(key=lambda r: (r["date"] is None, r["date"] or "", (r["race_name"] or "").lower()))
    return races


def build_activity(row, race_key_by_page):
    date, hour = local_date_hour(row)
    a = {"id": str(row.get("Activity ID")), "date": date, "hour": hour,
         "name": blank(row.get("Name")), "type": blank(row.get("Type"))}
    for key, prop in ACTIVITY_PROPS.items():
        a[key] = num(row.get(prop), key)
    links = [race_key_by_page[p] for p in row.get("Race") or [] if p in race_key_by_page]
    a["race_id"] = links[0] if links else None
    a["dup"] = 1 if row.get("Probable duplicate") else 0
    return a


def iso_week_start(date):
    d = dt.date.fromisoformat(date)
    return (d - dt.timedelta(days=d.weekday())).isoformat()


def build_aggregates(activities):
    real = [a for a in activities if not a["dup"] and a["date"]]
    buckets = {"weekly": lambda a: iso_week_start(a["date"]),
               "monthly": lambda a: a["date"][:7],
               "yearly": lambda a: a["date"][:4]}
    out = {}
    for name, keyfn in buckets.items():
        acc = defaultdict(lambda: [0, 0.0, 0])
        for a in real:
            for t in (a["type"] or "Unknown", "All"):
                cell = acc[(keyfn(a), t)]
                cell[0] += 1
                cell[1] += a["km"] or 0
                cell[2] += a["moving_s"] or 0
        out[name] = {
            "fields": ["period", "type", "count", "km", "hours"],
            "rows": [[p, t, c, round(km, 2), round(s / 3600, 2)]
                     for (p, t), (c, km, s) in sorted(acc.items())],
        }
    pbs = []
    runs, outliers = [], []
    for a in real:
        if a["type"] in PB_RUN_TYPES and a["km"] and a["moving_s"]:
            (runs if a["moving_s"] / a["km"] >= MIN_PLAUSIBLE_PACE_S else outliers).append(a)
    for threshold, label in PB_THRESHOLDS:
        pool = [a for a in runs if a["km"] >= threshold]
        if not pool:
            continue
        best = min(pool, key=lambda a: (a["moving_s"] / a["km"], a["date"]))
        pace = best["moving_s"] / best["km"]
        pbs.append({
            "min_km": threshold, "label": label, "activity_id": best["id"],
            "date": best["date"], "name": best["name"], "km": best["km"],
            "moving_s": best["moving_s"], "elapsed_s": best["elapsed_s"], "pace_s_per_km": round(pace, 1),
            "pace": f"{int(pace // 60)}:{int(round(pace % 60)):02d}/km",
            "race_id": best["race_id"], "candidates": len(pool),
        })
    out["run_bests"] = {
        "note": ("Fastest WHOLE activity of type Run whose distance is at least min_km, ranked by "
                 "average moving pace (moving time / distance). These are whole-activity paces, "
                 "not Strava best efforts or segment times. Duplicates are excluded, and so are "
                 "runs faster than min_plausible_pace_s (GPS glitches, uncalibrated treadmills)."),
        "min_plausible_pace_s": MIN_PLAUSIBLE_PACE_S,
        "excluded_outliers": [{"activity_id": a["id"], "date": a["date"], "name": a["name"], "km": a["km"],
                               "pace_s_per_km": round(a["moving_s"] / a["km"], 1)}
                              for a in sorted(outliers, key=lambda a: a["date"]) if a["km"] >= PB_THRESHOLDS[0][0]],
        "rows": pbs,
    }
    types = defaultdict(lambda: [0, 0.0, 0])
    for a in real:
        cell = types[a["type"] or "Unknown"]
        cell[0] += 1
        cell[1] += a["km"] or 0
        cell[2] += a["moving_s"] or 0
    out["totals_by_type"] = {t: {"count": c, "km": round(km, 1), "hours": round(s / 3600, 1)}
                             for t, (c, km, s) in sorted(types.items())}
    out["meta"] = {
        "activities": len(real), "excluded_duplicates": len(activities) - len(real),
        "first_date": min(a["date"] for a in real) if real else None,
        "last_date": max(a["date"] for a in real) if real else None,
        "week_starts_on": "Monday (ISO week)", "hours": "moving time",
        "km_note": "Swim distances are in km too (Strava metres / 1000).",
        "type_All": "Rows with type 'All' are the sum over every type for that period.",
    }
    return out


def build(race_rows, activity_rows):
    race_key_by_page = {r["_id"]: blank(r.get("Race key")) or r["_id"] for r in race_rows}
    acts, by_page = [], {}
    for row in activity_rows:
        a = build_activity(row, race_key_by_page)
        acts.append(a)
        by_page[row["_id"]] = a
    acts.sort(key=lambda a: (a["date"] or "", a["hour"] if a["hour"] is not None else -1, a["id"]))
    races = build_races(race_rows, by_page)
    activities = {
        "format": "rows",
        "fields": list(ACTIVITY_FIELDS),
        "strava_url": STRAVA_URL,
        "notes": {
            "date": "local calendar date of the start (time zone inferred per trip)",
            "hour": "local start hour 0-23; exact start time and UTC timestamps are not published",
            "km": "distance in km (swims included, converted from metres)",
            "race_id": "races.json id of the linked race, or null",
            "dup": "1 = probable duplicate upload; excluded from aggregates",
        },
        "rows": [[a[f] for f in ACTIVITY_FIELDS] for a in acts],
    }
    return races, activities, build_aggregates(acts)


def write(races, activities, aggregates, out_dir=DATA):
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "races.json").write_text(json.dumps(races, ensure_ascii=False, indent=2) + "\n")
    for name, obj in (("activities.json", activities), ("aggregates.json", aggregates)):
        (out_dir / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n")
    links = sum(1 for r in activities["rows"] if r[ACTIVITY_FIELDS.index("race_id")])
    print(f"races.json: {len(races)} races; activities.json: {len(activities['rows'])} activities "
          f"({links} linked to a race); aggregates.json written to {out_dir}")


# --------------------------------------------------------------------------- self-test
def self_test():
    races = [
        {"_id": "r1", "Race name": "Test 10k", "Date": "2024-05-05", "Distance": "10K",
         "Finish seconds": 2400.0, "Race key": "rr:0", "Source": "Notion", "Strava activities": ["a2"]},
        {"_id": "r2", "Race name": "Undated", "Race key": "rr:1", "Source": "Notion"},
    ]
    acts = [
        {"_id": "a1", "Activity ID": "1", "Date": "2024-05-04T06:12:00.000+00:00", "Name": "Easy",
         "Type": "Run", "Distance km": 5.0, "Moving s": 1800, "Description": "secret",
         "Start UTC": "2024-05-03T23:12:00Z", "Time zone": "Australia/Perth", "Probable duplicate": False},
        {"_id": "a2", "Activity ID": "2", "Date": "2024-05-05T09:01:00.000+00:00", "Name": "Race",
         "Type": "Run", "Distance km": 10.0, "Moving s": 2400, "Race": ["r1"], "Probable duplicate": False},
        {"_id": "a3", "Activity ID": "3", "Date": "2024-05-05T09:01:00.000+00:00", "Name": "Race copy",
         "Type": "Run", "Distance km": 10.0, "Moving s": 2000, "Probable duplicate": True},
    ]
    acts.append({"_id": "a4", "Activity ID": "4", "Date": "2024-05-06", "Name": "GPS glitch", "Type": "Run",
                 "Distance km": 9.0, "Moving s": 1800, "Probable duplicate": False})
    r, a, g = build(races, acts)
    assert [x["race_name"] for x in r] == ["Test 10k", "Undated"]
    assert r[0]["strava_activity_ids"] == ["2"] and r[0]["finish_seconds"] == 2400 and r[0]["id"] == "rr:0"
    assert a["fields"][:3] == ["id", "date", "hour"] and len(a["rows"]) == 4
    blob = json.dumps(a)
    assert "secret" not in blob and "23:12" not in blob and "07:12" not in blob
    first = dict(zip(a["fields"], a["rows"][0]))
    assert first["date"] == "2024-05-04" and first["hour"] == 7
    second = dict(zip(a["fields"], a["rows"][1]))
    assert second["race_id"] == "rr:0" and second["hour"] == 10  # 09:01 UTC shown in Dublin (IST)
    assert g["meta"]["activities"] == 3 and g["meta"]["excluded_duplicates"] == 1
    best = {p["label"]: p for p in g["run_bests"]["rows"]}
    assert best["5k"]["activity_id"] == "2" and best["10k"]["activity_id"] == "2"  # dup a3 ignored
    assert [o["activity_id"] for o in g["run_bests"]["excluded_outliers"]] == ["4"]
    week = [row for row in g["weekly"]["rows"] if row[1] == "All"]
    assert week == [["2024-04-29", "All", 2, 15.0, 1.17], ["2024-05-06", "All", 1, 9.0, 0.5]], week
    print("self-test ok")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--from-flat", nargs=2, metavar=("RACES_JSON", "ACTIVITIES_JSON"))
    ap.add_argument("--out", type=Path, default=DATA)
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return
    if args.from_flat:
        race_rows = json.loads(Path(args.from_flat[0]).read_text())
        activity_rows = json.loads(Path(args.from_flat[1]).read_text())
    else:
        token = os.environ.get("NOTION_TOKEN")
        if not token:
            sys.exit("Set NOTION_TOKEN (Notion internal integration token) first.")
        race_rows = [flatten(p, token) for p in query_database(RACES_DB, token)]
        activity_rows = [flatten(p, token) for p in query_database(ACTIVITIES_DB, token)]
    write(*build(race_rows, activity_rows), out_dir=args.out)


if __name__ == "__main__":
    main()
