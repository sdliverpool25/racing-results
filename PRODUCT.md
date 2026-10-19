# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML, CSS, and JavaScript. No build step. GitHub Pages serves the site from the `main` branch root. Chart.js is loaded from a CDN. Race data is a committed JSON file, not a live API.

## Users

Shane Drumm, an endurance athlete (running, triathlon, Ironman, cycling, swimming), reviewing his own race history. Inferred: anyone he sends the GitHub Pages link to, reading the same public archive.

## Product Purpose

A browsable archive of Shane's race results. Success means every real race is findable, personal bests match the recorded finish times, and the page can be republished by replacing `data/races.json`.

## Positioning

Finish times, splits, and notes from one athlete's Notion race database, ranked into personal bests on the page, plus every Strava activity for a training view. A generic results widget could not show this history without this data.

## Operating Context

Results are maintained in Notion: the "Races" and "Strava Activities" databases under Racing Results > Training & Racing Data. The site reads only the static exports in `data/`. A local script (`scripts/refresh_from_notion.py`) rewrites them when `NOTION_TOKEN` is set. The original race notes also live in Notion; some rows link back there.

## Capabilities and Constraints

- Show a personal best per distance from `finish_seconds`, with the race and date. Leave out `source` `Strava (added 19 Oct 2026)`. Ironman and 70.3 bests include swim, bike, and run splits.
- Search by name and notes. Filter by discipline, distance, year, and source. Sort by date or finish time. Strava-detected races show a from Strava badge and their linked activities.
- Open a race to see splits, notes, Strava and Notion links, and any data-issues note.
- Charts: races per year by discipline, and official finish time over years for a chosen distance.
- Training dashboard and a shareable report builder, both from the Strava export, excluding duplicate uploads.
- The site must not contain a Notion token or any other secret. The public data must not include activity descriptions, UTC timestamps, or start times finer than the hour. No GitHub Action that needs secrets.
- 97 races: 79 from the original archive (including 22 parkruns) and 18 detected in Strava. 1,976 activities, 4 of them duplicates.

## Brand Commitments

The page is for Shane Drumm and should feel clean, sporty, and modern. No separate logo or color system was supplied.

## Evidence on Hand

`data/races.json`, generated from the attached race-results export. Do not invent times, places, or rankings. Location and placing fields are empty in the current export.

## Product Principles

- The recorded official time wins. Personal bests are the minimum `finish_seconds` in each distance among races that are not Strava elapsed times.
- Show data problems quietly. They belong to the race, not to a warning banner over the archive.
- Keep the public site static. Refresh is a deliberate local step.
- A race with no finish time is still a race. It stays in the list and out of the bests.

## Accessibility & Inclusion

The archive is read on a phone and on a desk. Controls must work with a keyboard, text must meet contrast on the page colors, and times must stay readable when text is resized.
