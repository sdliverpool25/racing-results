---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Race results

## Scope

The whole public archive at `index.html`. Mode: operate.

## Audience

Shane Drumm, looking up a finish, a split, or a season. Job: find a race and compare it with the fastest mark at that distance.

## Constraints

Static files only. Times come from `data/races.json`. Empty row and COVID YEAR stay hidden until asked for. No token on the page.

## Direction contract

THESIS: Personal bests are course-marker plates you can pick, and the page refuses a row of equal stat tiles. The shell stays a normal results browser: bar, filters, table, charts.

OWN-WORLD: Roadside green shell, cool gravel ground, white plates, condensed numerals for distances and times. Selection is a drawn ring plus a course-yellow reflector. Chart series use distinct discipline inks.

STORY: The visitor reads the fastest mark at each distance, picks a marker to narrow the sheet, and opens a race for splits, notes, and links.

FIRST VIEWPORT: A green top bar with the name and three section links. Under it, the personal-best plates and a results board for the fastest Ironman (time, race, date, swim/bike/run). The race sheet starts immediately after. The primary action is a marker plate or the search field.

FORM: Kilometer marker plates, third grounded candidate. Seed key 6a37b4f8.

RAISE transit diagram (declined): the chosen distance’s discipline stays at full strength in the year chart; the other series recede.
RAISE catalog grid (declined): the active plate is ringed, not only recolored.
RAISE lexicon (declined): the race heading names the first and last race in the current view.
RAISE datamatics (declined): the progression chart is one hairline over fine year ticks, with no filled blob.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
