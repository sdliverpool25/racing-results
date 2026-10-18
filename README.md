# Shane Drumm — race results

A static archive of Shane Drumm's running, triathlon, Ironman, cycling, and swimming results. The page is plain HTML, CSS, and JavaScript. GitHub Pages can serve it from the repository root with no build.

Open the site and you get:

- Personal bests: the fastest `finish_seconds` in each distance, with the race and date. Ironman and 70.3 bests include swim, bike, and run splits.
- Every race in a list you can search (name and notes), filter (discipline, distance, year), and sort (date or finish time).
- A race row that opens onto splits, notes, Strava and Notion links, and any data note from the source.
- Two charts: races per year by discipline, and finish time across years for a chosen distance.

The export has 59 rows. One row is empty and one is a `COVID YEAR` placeholder. Both stay hidden until you turn on **Show placeholder rows**, which leaves 57 races in the list.

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

## Refresh the data from Airtable

The source of truth is the Airtable base **Racing Results**.

- Base: `app3YvIK7HbQSRz9F`
- Table: `tblY7mO0TnClARyfZ` (Race Results)

The website does not contain an API token. To pull a new `data/races.json`, create a [personal access token](https://airtable.com/create/tokens) with `data.records:read` on that base, then run the script on your machine:

```bash
export AIRTABLE_TOKEN="pat..."
python3 scripts/refresh_from_airtable.py
```

The script uses only the Python standard library. It reads `AIRTABLE_TOKEN` from the environment, downloads every record, and rewrites `data/races.json`. Commit that file and push to `main` for GitHub Pages to pick it up. Do not commit the token, and do not put it in the HTML or the JSON.

Check the mapper without calling Airtable:

```bash
python3 scripts/refresh_from_airtable.py --self-test
```

Check the personal bests locked to the current export:

```bash
python3 tests/check_archive.py
```

## Layout

- `index.html`, `styles.css`, `app.js` — the site
- `data/races.json` — the static export the page reads
- `scripts/refresh_from_airtable.py` — regenerates that export
- `fonts/` — Barlow and Big Shoulders Display, SIL Open Font License (`fonts/OFL.txt`)
