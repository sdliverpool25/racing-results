# Shane Drumm — race results

A static archive of Shane Drumm's running, triathlon, Ironman, cycling, and swimming results. The page is plain HTML, CSS, and JavaScript. GitHub Pages can serve it from the repository root with no build.

Open the site and you get:

- Personal bests: the fastest `finish_seconds` in each distance, with the race and date. Official results only: rows whose `source` is `Strava (added 19 Oct 2026)` stay out of the bests, because that time is a Strava elapsed time. Counting them would show the 9.98 km Walyunga trail run as the Trail best. Ironman and 70.3 bests include swim, bike, and run splits.
- Every race in a list you can search (name and notes), filter (discipline, distance, year, source), and sort (date or finish time). Strava-detected races carry a **from Strava** badge. There is no placeholder toggle.
- A race row that opens onto splits, notes, each linked Strava activity, the Notion page, and any data note from the source.
- Two charts: races per year by discipline, and finish time across years for a chosen distance. The finish-time chart uses official results unless the source filter is set to From Strava.
- **Training** (`training.html`): weekly and monthly volume stacked by sport, a date range (last 12 weeks, last 12 months, all time, or one year), year-on-year totals, run pace and average heart rate, a sport-by-year table, run bests labelled whole-activity pace, and a searchable activity list. Duplicate uploads (`dup` = 1) are excluded. A yellow diamond marks a period that includes a race.
- **Reports** (`reports.html`): pick a metric (kilometres, hours, count, elevation, average heart rate, relative effort), group by week, month, or year, filter by sport and date, and choose a bar or line. The choice is stored in the query string (`metric`, `group`, `sport`, `from`, `to`, `chart`) so a report can be bookmarked. Download CSV writes the rows in the chart.

The export has 97 races: 79 from the original archive (including 22 parkruns) and 18 events detected in Shane's Strava history (`source` = `Strava (added 19 Oct 2026)`; their finish time is the Strava elapsed time, not an official result). There are no placeholder rows any more; the empty row and the `COVID YEAR` row were not carried into Notion. The **Parkrun** toggle lists the 22 parkrun 5Ks and points the finish-time chart at them.

v2 adds `data/activities.json` (every Strava activity) and `data/aggregates.json` (training totals and run bests) for a Training dashboard.

## Browse locally

The page loads `data/races.json` with `fetch`, so open it through a small web server rather than as a file on disk.

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## GitHub Pages

1. Push this branch to `main`.
2. In the repository on GitHub, open **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set the branch to **main** and the folder to **/ (root)**.
5. Save.

The site will be published at `https://<user>.github.io/racing-results/`. An empty `.nojekyll` file is in the root so GitHub Pages serves the files as they are and does not run Jekyll.

There is no GitHub Action. Publishing does not need a secret.

## Refresh the data from Notion

The source of truth is two Notion databases under **Racing Results > Training & Racing Data**:

- **Races** (`b4eccfb740f14f9f80446d62f0a718ad`): one row per race, with a two-way relation to its Strava activities.
- **Strava Activities** (`e45f7016dea94d3ba1af2ad2d5e1ca00`): one row per activity from the Strava bulk export, with a `Race` relation.

The website does not contain an API token and never calls Notion. To rebuild the data files:

1. Create an internal integration at <https://www.notion.so/profile/integrations> with **Read content** only, and copy its token.
2. In Notion, open each of the two databases, choose **••• > Connections**, and add the integration (otherwise the API answers 404).
3. Run the script on your machine:

```bash
export NOTION_TOKEN="ntn_..."
python3 scripts/refresh_from_notion.py
python3 tests/check_archive.py   # update its expected counts/PBs if you added races
```

The script uses only the Python standard library (Python 3.9+; on Windows also `pip install tzdata`). It uses the official Notion REST API (`Notion-Version: 2022-06-28`, `POST /v1/databases/{id}/query`), reads `NOTION_TOKEN` from the environment, downloads every page of both databases, and rewrites `data/races.json`, `data/activities.json` and `data/aggregates.json`. Commit those files and push to `main` for GitHub Pages to pick them up. Do not commit the token, and do not put it in the HTML or the JSON.

Optional environment variables: `NOTION_RACES_DB`, `NOTION_ACTIVITIES_DB` (if the databases move), `NOTION_WALLCLOCK_TZ` (default `Europe/Dublin`, see below), `MIN_PLAUSIBLE_PACE_S` (default `240`).

Check the transform without calling Notion:

```bash
python3 scripts/refresh_from_notion.py --self-test
```

`--from-flat RACES.json ACTIVITIES.json` builds from already-flattened rows (`{"_id": page_id, "<Property>": value}`) for debugging without a token.

### Privacy

The site is public, so the export deliberately leaves out activity descriptions, UTC timestamps and exact start times. An activity carries its local date and local start hour only. The local time comes from the `Start UTC` and `Time zone` properties in Notion (time zone inferred per trip from the export). If those are missing, the script falls back to the `Date` property. Notion keeps a zone-less time as an instant in the workspace owner's zone (Europe/Dublin) and the API returns it in UTC, so the fallback converts it back with `NOTION_WALLCLOCK_TZ`.

## Data files

### `data/races.json`

This is a list of race objects sorted by date, then name. It uses the same keys v1 used: `race_name, date, discipline, distance, distance_km, distance_original, event_type, race_category, finish_time, finish_seconds, swim, t1, bike, t2, run, location, position, notes, link, strava_bike, strava_bike_label, notion_title, raw_times, notion_page, data_issues`. Notion property names map one-to-one; `Position` maps to `position`. There are three new keys:

- `id`: a stable race key, `rr:<n>` for archive races and `strava:<activity id>` for Strava-detected ones. `activities.json` uses it as `race_id`.
- `source`: one of `Notion`, `parkrun` or `Strava (added 19 Oct 2026)`.
- `strava_activity_ids`: Strava activity ids linked to the race, oldest first. Triathlons list every leg.

### `data/activities.json`

This file is row-oriented to keep it small: `{"format": "rows", "fields": [...], "strava_url": "https://www.strava.com/activities/{id}", "notes": {...}, "rows": [[...], ...]}`. Each row holds values in `fields` order:

| field | meaning |
|---|---|
| `id` | Strava activity id (string). The link is `strava_url` with `{id}` replaced. |
| `date` | local start date `YYYY-MM-DD` |
| `hour` | local start hour, 0–23 |
| `name`, `type` | Strava name and sport type (Run, Ride, Swim, Virtual Ride, Weight Training, …) |
| `km` | distance in km (swims converted from metres) |
| `moving_s`, `elapsed_s` | moving and elapsed time, seconds |
| `elev_m` | elevation gain, metres |
| `avg_hr`, `max_hr`, `avg_watts`, `weighted_watts`, `cadence`, `calories`, `relative_effort` | as recorded; `null` when absent |
| `race_id` | `races.json` `id` of the linked race, or `null` |
| `dup` | `1` for a probable duplicate upload. These rows are excluded from aggregates. |

Rows are sorted by date and hour.

### `data/aggregates.json`

This file is precomputed from non-duplicate activities:

- `weekly`, `monthly`, `yearly`: `{"fields": ["period","type","count","km","hours"], "rows": [...]}`. `period` is the ISO week's Monday (`YYYY-MM-DD`), `YYYY-MM` or `YYYY`. `type` is a Strava sport type, or `All` for the sum over every type. `hours` is moving time.
- `totals_by_type`: all-time count, km and hours per type.
- `run_bests`: for 5k, 10k, 21.1k and 42.2k, the fastest whole `Run` activity of at least that distance, ranked by average moving pace. These are whole-activity paces, not Strava best efforts or segment times. Runs faster than `min_plausible_pace_s` (4:00/km) are GPS glitches or treadmill errors; they are listed under `excluded_outliers`.
- `meta`: counts, date range and unit notes.

## Layout

- `index.html`, `training.html`, `reports.html`, `styles.css`, `app.js`, `training.js`, `reports.js`, `archive.js` — the site
- `data/races.json`, `data/activities.json`, `data/aggregates.json` — the static exports the page reads
- `scripts/refresh_from_notion.py` — regenerates them from Notion
- `tests/check_archive.py` — locks counts, links, privacy and the personal bests
- `fonts/` — Barlow and Big Shoulders Display, SIL Open Font License (`fonts/OFL.txt`)
