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

Finish times, splits, and notes from one athlete's Airtable table, ranked into personal bests on the page. A generic results widget could not show this history without this table.

## Operating Context

Results are maintained in the Airtable base "Racing Results" (`app3YvIK7HbQSRz9F`), table "Race Results" (`tblY7mO0TnClARyfZ`). The site reads only the static export. A local script rewrites that export when `AIRTABLE_TOKEN` is set. The original notes live in Notion; some rows link back there.

## Capabilities and Constraints

- Show a personal best per distance from `finish_seconds`, with the race and date. Ironman and 70.3 bests include swim, bike, and run splits.
- Search by name and notes. Filter by discipline, distance, and year. Sort by date or finish time.
- Open a race to see splits, notes, Strava and Notion links, and any data-issues note.
- Charts: races per year by discipline, and finish time over years for a chosen distance.
- Hide the empty row and the "COVID YEAR" placeholder unless the reader asks to see them.
- The site must not contain an Airtable token or any other secret. No GitHub Action that needs secrets.
- 59 records in the export: 57 real races, one empty row, one placeholder.

## Brand Commitments

The page is for Shane Drumm and should feel clean, sporty, and modern. No separate logo or color system was supplied.

## Evidence on Hand

`data/races.json`, generated from the attached race-results export. Do not invent times, places, or rankings. Location and placing fields are empty in the current export.

## Product Principles

- The recorded time wins. Personal bests are the minimum `finish_seconds` in each distance, not a hand-picked highlight.
- Show data problems quietly. They belong to the race, not to a warning banner over the archive.
- Keep the public site static. Refresh is a deliberate local step.
- A race with no finish time is still a race. It stays in the list and out of the bests.

## Accessibility & Inclusion

The archive is read on a phone and on a desk. Controls must work with a keyboard, text must meet contrast on the page colors, and times must stay readable when text is resized.
