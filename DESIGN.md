---
name: Shane Drumm Race Results
description: A roadside archive of one athlete's finish times, splits, and seasons.
colors:
  shell: "#16352c"
  mark: "#f0c400"
  ink: "#14241c"
  ink-soft: "#2a4538"
  paper: "#f4f6f1"
  ground: "#e7ebe4"
  plate: "#f7f8f4"
  line: "#c5cfc6"
  swim: "#0e6e78"
  bike: "#1e4d8c"
  run: "#b23a2e"
  missing: "#8a4e12"
  trail-run: "#3f6b45"
  open-water: "#2a6f97"
  duathlon: "#5c4a78"
  unspecified: "#5c564c"
typography:
  display:
    fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif'
    fontSize: "clamp(3.5rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif'
    fontSize: "clamp(2.2rem, 5vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif'
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  marker:
    fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif'
    fontSize: "1.7rem"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.03em"
  time:
    fontFamily: '"Big Shoulders Display", "Arial Narrow", sans-serif'
    fontSize: "1.45rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  body:
    fontFamily: '"Barlow", "Segoe UI", sans-serif'
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: '"Barlow", "Segoe UI", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.45
rounded:
  plate: "2px"
spacing:
  tight: "0.35rem"
  row: "0.75rem"
  stack: "1rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.paper}"
    rounded: "{rounded.plate}"
    padding: "0.4rem 0.85rem"
  button-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "0.35rem 0.8rem"
  button-toggle-pressed:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.paper}"
    rounded: "{rounded.plate}"
    padding: "0.35rem 0.8rem"
  marker-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "0.85rem 0.75rem 0.55rem"
    typography: "{typography.marker}"
  input-search:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "0.4rem 0.7rem"
  nav-link:
    textColor: "{colors.paper}"
    padding: "0.35rem 0"
  chip-placeholder:
    textColor: "{colors.ink-soft}"
    rounded: "0px"
    padding: "0.05rem 0.35rem"
  race-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "0.75rem 0.15rem"
    typography: "{typography.time}"
  race-row-open:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    padding: "0.75rem 0.15rem"
---

# Design System: Shane Drumm Race Results

## Overview

**Creative North Star: "The Kilometer Marker"**

The archive reads like a course. A dark green roadside shell holds the name and the section links, cool gravel covers the page, and personal bests are white plates you pick up one at a time. Each plate has a course-yellow reflector cap, a condensed distance code, and a finish time. Under the plates, one distance is featured on the board: the time in huge condensed numerals, then the race, the date, and the swim, bike, and run bar when the distance is an Ironman or a 70.3.

The rest of the page is a results browser: filters, a flush race sheet, and two charts, set in Barlow. Big Shoulders Display is reserved for times, distance codes, section titles, the wordmark, and chart captions. Both families are self-hosted in `fonts/` (display weights 800 and 700, Barlow weights 400, 600, and 700) under the SIL Open Font License. The page is light only (`color-scheme: light`). Course yellow stays scarce: the cap, the current-section underline, text selection, and the focus ring on the green bar.

**Key Characteristics:**

- Roadside green shell and colophon on cool gravel, with plate-white surfaces for markers, fields, and an open race.
- Course yellow used as a 7px cap, the current-section underline, text selection, and the focus ring on the green bar.
- Big Shoulders Display for times, distance codes, and section titles; Barlow for sentences, filters, and dates.
- 2px corners, a 2px ink ring for selection and focus, and one soft shadow under the sticky bar.
- A separate ink for each discipline, with chart series that are out of view drawn at 28% opacity.

## Colors

Roadside green is the structure, gravel is the ground, and course yellow is a reflector. Discipline inks are reserved for splits and charts.

### Primary

- **Roadside Green** (`shell`, #16352c): The sticky bar, the colophon, a pressed discipline filter, the filled action button, the scrollbar thumb, and the Run chart series. Theme color matches this green.

### Secondary

- **Course Yellow** (`mark`, #f0c400): A 7px cap across the top of every marker plate, the 3px underline on the current section link, text selection (yellow ground, ink type), the skip link, and the focus ring of links inside the green bar.

### Tertiary

- **Swim Teal** (`swim`, #0e6e78): Split swim, in-page text links, and the Triathlon chart series.
- **Bike Blue** (`bike`, #1e4d8c): Split bike and the Cycling chart series.
- **Run Red** (`run`, #b23a2e): Split run and the Ironman chart series.
- **Trail Green** (`trail-run`, #3f6b45): Trail Run chart series.
- **Open Water** (`open-water`, #2a6f97): Swim chart series. This is a different teal from the split swim.
- **Duathlon Plum** (`duathlon`, #5c4a78): Duathlon chart series.
- **Unspecified Dust** (`unspecified`, #5c564c): Unspecified chart series, and the fallback when a discipline has no ink.

### Neutral

- **Marker Ink** (`ink`, #14241c): Body text, plate borders, field borders, the focus ring, and chart tick labels. Chart grid lines are this ink at 12% opacity, and at 8% on the progression chart's year axis.
- **Shade Green** (`ink-soft`, #2a4538): Ledes, board meta, captions, dates, placeholders, quiet labels, and the placeholder chip.
- **Shell Paper** (`paper`, #f4f6f1): Type and wordmark on the green shell and the colophon.
- **Gravel** (`ground`, #e7ebe4): The page background and the scrollbar track.
- **Plate White** (`plate`, #f7f8f4): Marker plates, fields, an open race row, and the expanded detail. A closed row hover is this white at 70% opacity (`rgba(247, 248, 244, 0.7)`).
- **Gravel Line** (`line`, #c5cfc6): The board's top rule, row rules, tag borders, and list rules.
- **Missing Rust** (`missing`, #8a4e12): The "No time" label when a race has no finish. That label is Barlow, not the display face.

### Named Rules

**The Reflector Rule.** Course yellow is a cap, an underline, a selection, or a focus ring on the green bar. It does not fill a button, a bar, or a page region.

**The Discipline Ink Rule.** Swim, bike, and run keep the split inks above. Each chart discipline uses its own ink from this list, and the Run series uses the shell green. A year-chart series that is not the one in view is drawn at 28% opacity. The series in view stays at full strength.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow, then sans-serif)
**Body Font:** Barlow (with Segoe UI, then sans-serif)

**Character:** Big Shoulders Display is the condensed course numeral. Barlow is the voice of names, notes, filters, and dates. On a marker the code and the time are display type, and the distance name is Barlow. Files in `fonts/` are `big-shoulders-display-800.woff2`, `big-shoulders-display-700.woff2`, `barlow-400.woff2`, `barlow-600.woff2`, and `barlow-700.woff2`, licensed under the SIL Open Font License. `font-display` is `swap`.

### Hierarchy

- **Display** (800, `clamp(3.5rem, 8vw, 6rem)`, line-height 0.82, tracking -0.035em, tabular figures): The featured finish on the board.
- **Headline** (800, `clamp(2.2rem, 5vw, 3.4rem)`, line-height 0.9, tracking -0.03em): Section titles. Headings and paragraphs use `text-wrap: balance`.
- **Title** (800, `clamp(2rem, 4vw, 3rem)`, line-height 0.9, tracking -0.03em): The distance name on the board. The wordmark is the same face at 1.85rem, line-height 1, tracking -0.03em. Chart captions are 1.8rem, line-height 1, tracking -0.03em, and a caption's select drops back to Barlow at 1rem, weight 600.
- **Marker** (800, 1.7rem, line-height 0.9, tracking -0.03em): The distance code on a plate.
- **Time** (700, 1.45rem, tracking -0.02em, tabular figures): Split times and the finish column. The time printed on a plate is the same face and weight at 1.15rem. A missing finish leaves this face and becomes Barlow at 0.95rem, weight 700, in Missing Rust.
- **Body** (400, 1.0625rem, line-height 1.45): The page default. Ledes, notes, data notes, and the colophon wrap at 68ch. Chart captions wrap at 62ch. The race name under a board time is 1.25rem, weight 600.
- **Label** (700, 0.8125rem, line-height 1.45): Field labels and definition terms. Plate names, split names, and the sheet's column heads are 0.78rem, weight 700; the column heads add 0.02em of tracking. The placeholder chip is 0.75rem.

### Named Rules

**The Numeral Rule.** A recorded finish, a split, and a distance code are Big Shoulders Display. Names, notes, filters, dates, and the words "No time" stay in Barlow.

## Layout

The column is `min(1120px, calc(100% - 2rem))`, centered. The sticky shell is at least 4rem tall. Sections clear it with `scroll-margin-top: 5.25rem`. The first section pads 1.75rem at the top; each following section adds 1.5rem of margin and 2.25rem of padding. The colophon is a green band with 3rem of space above it and 1.5rem / 2.5rem of vertical padding.

Marker plates wrap on a 0.7rem gap. At 720px and below they become one horizontal row with mandatory scroll snapping. At 800px the board splits into two columns, the finish aligns right, filters sit on one row (`1.4fr` plus three equal tracks), and an open race splits into two columns. At 860px the sheet becomes one line: 7.5rem, 1.6fr, 8.5rem, 7.5rem, 6.25rem, 1.5rem, for date, race, distance, discipline, finish, and chevron. Below that width the row stacks: date and time, then name, then distance, and the discipline column is hidden. At 960px the two charts sit side by side with a 2.5rem gap. Each chart frame is 280px tall.

Controls, the checkbox row, and disclosure summaries are at least 2.75rem tall. Keyboard focus is a 2px ink outline offset 3px. On the green bar that outline is course yellow. Document scroll is smooth, and it becomes auto when `prefers-reduced-motion` is set.

### Named Rules

**The Sheet Rule.** Below 860px a race is a stacked row. At 860px and above it is one line: date, name, distance, discipline, finish, chevron.

## Elevation & Depth

Depth is tonal, plus one shadow. Gravel is the page. Plate white is the raised reading surface: markers, fields, an open row, and the detail. Roadside green is the band at the top and the foot. The sticky shell is the only surface with a shadow, so the bar stays separate while it covers the gravel. Plates, rows, and fields are flat. A closed row hover is a plate wash, not a lift. An open row drops its bottom rule and fills with plate white. Chart structure is a hairline grid of ink, not a shadow.

### Shadow Vocabulary

- **Shell** (`box-shadow: 0 4px 14px rgba(20, 36, 28, 0.16)`): The sticky bar only.

### Named Rules

**The One Shadow Rule.** The sticky shell is the only lifted surface. Plates, rows, fields, and the colophon stay flat. Depth comes from gravel, plate white, and the green band.

## Shapes

Corners are almost square. Marker plates, fields, selects, discipline toggles, and the filled button use a 2px radius. Tags, split segments, the sheet, and the yellow cap are square. The cap is a 7px band across the top of the plate. The selected plate and keyboard focus share a drawn ring: 2px ink, offset 3px. The split bar is 0.8rem tall with 3px gaps and a 0.35rem minimum segment. The row chevron is a 16px stroked mark (1.6px stroke, current color) that rotates 180 degrees when the row is open.

### Named Rules

**The Squared Plate Rule.** Interactive surfaces use a 2px corner. Nothing in this system is a pill.

## Components

Controls feel like stamped plates: a hard ink edge, a short radius, and a ring when chosen. The filled button is the rare solid action. Most choices are an outline until pressed.

### Buttons

- **Shape:** 2px radius (`rounded.plate`). Weight 700. Minimum height 2.75rem.
- **Primary:** Roadside green fill, shell-paper type, 1px green border, padding 0.4rem 0.85rem. This is the clear-filters action. There is no separate hover fill.
- **Toggle:** Transparent ground, 1px ink border, ink type, padding 0.35rem 0.8rem. Pressed: green fill, green border, shell-paper type.
- **Hover / Focus:** Focus is the 2px ink ring, offset 3px. A pressed toggle does not grow a shadow.

### Chips

- **Style:** The placeholder chip is inline, 0.75rem, weight 700, Shade Green type, 1px gravel-line border, no radius, padding 0.05rem 0.35rem, with 0.4rem of space before it.
- **State:** It marks a placeholder row. It is not a filter.

### Cards / Containers

- **Corner Style:** Marker plates use the 2px radius. The open detail is square to the row.
- **Background:** Plate white. The page behind them is gravel.
- **Shadow Strategy:** None. See Elevation.
- **Border:** Plates use a 2px ink border and the 7px course-yellow cap. The detail has a bottom gravel line and padding 0.35rem 0.85rem 1.1rem.
- **Internal Padding:** Plates pad 0.85rem 0.75rem 0.55rem, with a minimum size of 5.8rem by 5.4rem. The code sits 0.2rem under the cap.

### Inputs / Fields

- **Style:** Labels are the label style, stacked 0.28rem above the control. Search and selects fill the track, with plate-white ground, a 1px ink border, 2px radius, and padding 0.4rem 0.7rem. The caret is ink. Placeholders are Shade Green at full opacity.
- **Focus:** The same 2px ink ring, offset 3px.
- **Error / Disabled:** No error chrome. An empty result offers the primary button. The checkbox uses the shell green as its accent and sits in a row at least 2.75rem tall.

### Navigation

The shell bar is roadside green, shell-paper type, and the shell shadow. The wordmark is Big Shoulders Display at 800 / 1.85rem and links to the bests. Section links are Barlow, weight 600, padding 0.35rem 0, with no underline until the section in view, which takes a 3px course-yellow underline offset 0.35em. Focus inside the bar uses the yellow ring. In-page links outside the bar are Swim Teal, underlined, with the underline offset 0.18em. The skip link is course yellow with ink type, weight 700, and it stays off-screen until focused.

### Marker plate

A personal best is a button, not a tile in a matched grid. The code is the marker style, the distance name is the compact label, and the time is the plate time (display face, 700, 1.15rem). Pressed state is the ink ring. Pressing again clears the distance filter. The plate does not change fill when selected.

### Race row

A full-width button with a gravel-line bottom border and transparent ground. Hover washes in plate white at 70%. Open state fills with plate white and clears the bottom border. The finish column is the time style, aligned to the right when the row is stacked and to the left in the wide sheet. The disclosure chevron is the stroked mark described in Shapes.

### Split bar

Ironman and 70.3 bests show swim, bike, and run as square segments in Swim Teal, Bike Blue, and Run Red, sized by share of the recorded split. Under the bar, a 0.7rem swatch, a compact label, and the time style. Transitions (T1, T2) sit beneath in Barlow, weight 600, Shade Green.

### Charts

Year counts are stacked bars with no stroke. Each discipline uses its tertiary ink, or the shell green for Run. A series that is not the one in view uses 28% alpha. The progression chart is one straight 2px stroke in the distance's discipline ink, with 5px square points, no curve (`tension: 0`), and no fill. Ticks and the legend are Barlow in Marker Ink. The legend swatch is 12px. Year bars animate for 600ms and the line for 700ms, both `easeOutQuart`, and both animations are off when reduced motion is requested. The chart frame is 280px tall.

### Named Rules

**The Ring Rule.** A selected marker uses the same 2px ink outline, offset 3px, as keyboard focus. Selection does not recolor the plate. On the green shell, focus swaps that outline to course yellow.

## Do's and Don'ts

### Do:

- **Do** paint the page gravel (`#e7ebe4`) and the sticky bar and colophon roadside green (`#16352c`).
- **Do** cap a marker plate with a 7px course-yellow band and a 2px ink border on plate white.
- **Do** set recorded finishes, splits, and distance codes in Big Shoulders Display, with tabular figures on the times.
- **Do** keep controls at least 2.75rem tall, and draw keyboard focus as a 2px ink outline offset 3px.
- **Do** draw a year-chart series that is out of view at 28% of its discipline ink, and draw the progression line as a 2px straight stroke with 5px square points and no fill.
- **Do** load Big Shoulders Display (700 and 800) and Barlow (400, 600, and 700) from `fonts/` under the SIL Open Font License.

### Don't:

- **Don't** fill a button, a chart bar, or a page region with course yellow (`#f0c400`).
- **Don't** round plates, fields, or toggles past 2px, and don't put a shadow on them.
- **Don't** set a recorded finish time in Barlow. Barlow is for the missing-time label.
- **Don't** show a selected marker by recoloring the plate. The selected state is the ink ring.
- **Don't** reuse the split swim teal (`#0e6e78`) for the Swim chart series (`#2a6f97`).
