/* Race archive. Personal bests are the minimum finish_seconds in each distance. */
(function () {
  const DISTANCE_ORDER = [
    "Sprint",
    "Olympic",
    "70.3",
    "T100",
    "Ironman",
    "5K",
    "12K",
    "Half Marathon",
    "Marathon",
    "Trail",
    "Ultra",
    "Gran Fondo",
    "Bike Time Trial",
    "Swim 5K",
    "Swim 10K",
  ];

  const MARKER = {
    Sprint: "SP",
    Olympic: "OLY",
    "70.3": "70.3",
    T100: "100",
    Ironman: "140.6",
    "5K": "5K",
    "12K": "12",
    "Half Marathon": "21.1",
    Marathon: "42.2",
    Trail: "TR",
    Ultra: "UL",
    "Gran Fondo": "GF",
    "Bike Time Trial": "TT",
    "Swim 5K": "5",
    "Swim 10K": "10",
  };

  const DISCIPLINE_ORDER = ["Run", "Trail Run", "Triathlon", "Ironman", "Cycling", "Swim", "Duathlon", "Unspecified"];

  const DISCIPLINE_COLOR = {
    Run: "#16352C",
    "Trail Run": "#3F6B45",
    Triathlon: "#0E6E78",
    Ironman: "#B23A2E",
    Cycling: "#1E4D8C",
    Swim: "#2A6F97",
    Duathlon: "#5C4A78",
    Unspecified: "#5C564C",
  };

  const SPLIT_FIELDS = [
    ["swim", "Swim", "#0E6E78"],
    ["bike", "Bike", "#1E4D8C"],
    ["run", "Run", "#B23A2E"],
  ];

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STRAVA_SOURCE = "Strava (added 19 Oct 2026)";

  const state = {
    discipline: "all",
    distance: "all",
    year: "all",
    source: "all",
    query: "",
    sort: "date-desc",
    chartDistance: "Ironman",
    parkrun: false,
    openId: null,
  };

  const els = {
    status: document.getElementById("status"),
    bests: document.getElementById("bests"),
    races: document.getElementById("races"),
    charts: document.getElementById("charts"),
    lede: document.getElementById("bests-lede"),
    posts: document.getElementById("posts"),
    board: document.getElementById("board"),
    span: document.getElementById("span"),
    disciplines: document.getElementById("disciplines"),
    distance: document.getElementById("distance"),
    year: document.getElementById("year"),
    sort: document.getElementById("sort"),
    query: document.getElementById("query"),
    source: document.getElementById("source"),
    parkrun: document.getElementById("parkrun-toggle"),
    progressCaption: document.getElementById("progress-caption"),
    list: document.getElementById("list"),
    chartDistance: document.getElementById("chart-distance"),
    yearCaption: document.getElementById("year-caption"),
    yearFallback: document.getElementById("year-fallback"),
    progressFallback: document.getElementById("progress-fallback"),
    yearTable: document.getElementById("year-table"),
    progressTable: document.getElementById("progress-table"),
  };

  let races = [];
  let bests = [];
  let yearChart = null;
  let progressChart = null;

  function isParkrun(race) {
    return race.event_type === "parkrun" || race.race_category === "parkrun";
  }

  function displayTime(value) {
    if (!value) return "";
    const parts = String(value).split(":");
    if (parts.length === 3 && Number(parts[0]) === 0) {
      return String(Number(parts[1])) + ":" + parts[2];
    }
    return String(value);
  }

  function officialResult(race) {
    return race.source !== STRAVA_SOURCE;
  }

  function formatDate(iso) {
    if (!iso) return "No date";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    const day = Number(parts[2]);
    const month = MONTHS[Number(parts[1]) - 1] || parts[1];
    return day + " " + month + " " + parts[0];
  }

  function parseClock(value) {
    if (!value) return null;
    const parts = String(value).split(":").map(Number);
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  function hexAlpha(hex, alpha) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function clockLabel(total, underHour) {
    const seconds = Math.round(total);
    if (underHour) {
      const minutes = Math.floor(seconds / 60);
      return minutes + ":" + String(seconds % 60).padStart(2, "0");
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h + ":" + String(m).padStart(2, "0");
  }

  function personalBests(rows) {
    const best = new Map();
    rows.forEach((race) => {
      if (!officialResult(race)) return;
      if (race.finish_seconds == null || !race.distance) return;
      const current = best.get(race.distance);
      if (!current || race.finish_seconds < current.finish_seconds) best.set(race.distance, race);
    });
    const ordered = [];
    DISTANCE_ORDER.forEach((distance) => {
      if (best.has(distance)) ordered.push(best.get(distance));
    });
    best.forEach((race, distance) => {
      if (!DISTANCE_ORDER.includes(distance)) ordered.push(race);
    });
    return ordered;
  }

  function chartRows() {
    if (state.source === "all") return races;
    return races.filter((race) => race.source === state.source);
  }

  function progressionRows() {
    return chartRows().filter((race) => state.source === STRAVA_SOURCE || officialResult(race));
  }

  function filteredRaces() {
    const q = state.query.trim().toLowerCase();
    return races
      .filter((race) => {
        if (state.source !== "all" && race.source !== state.source) return false;
        if (state.discipline !== "all" && (race.discipline || "Unspecified") !== state.discipline) return false;
        if (state.distance !== "all" && race.distance !== state.distance) return false;
        if (state.parkrun && !isParkrun(race)) return false;
        if (state.year !== "all" && (race.date || "").slice(0, 4) !== state.year) return false;
        if (!q) return true;
        const hay = ((race.race_name || "") + " " + (race.notes || "")).toLowerCase();
        return hay.includes(q);
      })
      .sort(compareRaces);
  }

  function compareRaces(a, b) {
    if (state.sort === "date-asc" || state.sort === "date-desc") {
      if (!a.date && !b.date) return (a.race_name || "").localeCompare(b.race_name || "");
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : (a.race_name || "").localeCompare(b.race_name || "");
      return state.sort === "date-asc" ? cmp : -cmp;
    }
    if (a.finish_seconds == null && b.finish_seconds == null) {
      return (b.date || "").localeCompare(a.date || "");
    }
    if (a.finish_seconds == null) return 1;
    if (b.finish_seconds == null) return -1;
    const cmp = a.finish_seconds - b.finish_seconds;
    if (cmp !== 0) return state.sort === "time-asc" ? cmp : -cmp;
    return (b.date || "").localeCompare(a.date || "");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function appendRich(node, text) {
    const source = text || "";
    const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    let last = 0;
    let match;
    while ((match = re.exec(source))) {
      if (match.index > last) node.append(document.createTextNode(source.slice(last, match.index)));
      const link = document.createElement("a");
      link.href = match[2] || match[3];
      link.textContent = match[1] || match[3];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      node.append(link);
      last = match.index + match[0].length;
    }
    if (last < source.length) node.append(document.createTextNode(source.slice(last)));
  }

  function externalLink(href, label) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(document.createTextNode(label));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 12 12 4M6.5 4H12v5.5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    svg.append(path);
    link.append(svg);
    return link;
  }

  function chevron() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("class", "c-chev");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M3 6l5 5 5-5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    svg.append(path);
    return svg;
  }

  function fillSelect(select, values, allLabel) {
    select.replaceChildren();
    const all = el("option", null, allLabel);
    all.value = "all";
    select.append(all);
    values.forEach((value) => {
      const option = el("option", null, value);
      option.value = value;
      select.append(option);
    });
  }

  function uniqueSorted(values, preferred) {
    const set = new Set(values.filter(Boolean));
    const ordered = [];
    (preferred || []).forEach((value) => {
      if (set.has(value)) {
        ordered.push(value);
        set.delete(value);
      }
    });
    Array.from(set).sort().forEach((value) => ordered.push(value));
    return ordered;
  }

  function renderChrome() {
    const pool = races;
    const disciplines = uniqueSorted(pool.map((race) => race.discipline), DISCIPLINE_ORDER);
    const distances = uniqueSorted(pool.map((race) => race.distance), DISTANCE_ORDER);
    const years = uniqueSorted(pool.map((race) => (race.date || "").slice(0, 4))).sort();

    els.disciplines.replaceChildren();
    ["all"].concat(disciplines).forEach((name) => {
      const button = el("button", null, name === "all" ? "All disciplines" : name);
      button.type = "button";
      button.setAttribute("aria-pressed", String(state.discipline === name));
      button.addEventListener("click", () => {
        state.discipline = name;
        renderList();
        renderCharts();
      });
      els.disciplines.append(button);
    });

    fillSelect(els.distance, distances, "All distances");
    fillSelect(els.year, years, "All years");
    els.distance.value = distances.includes(state.distance) || state.distance === "all" ? state.distance : "all";
    els.year.value = state.year;
    els.sort.value = state.sort;
    if (els.source) els.source.value = state.source;
    if (els.parkrun) els.parkrun.setAttribute("aria-pressed", String(state.parkrun));

    const timed = uniqueSorted(
      pool.filter((race) => officialResult(race) && race.finish_seconds != null).map((race) => race.distance),
      DISTANCE_ORDER
    );
    els.chartDistance.replaceChildren();
    timed.forEach((distance) => {
      const option = el("option", null, distance === "5K" ? "5K / parkrun" : distance);
      option.value = distance;
      els.chartDistance.append(option);
    });
    if (!timed.includes(state.chartDistance) && timed.length) state.chartDistance = timed.includes("Ironman") ? "Ironman" : timed[0];
    els.chartDistance.value = state.chartDistance;

    const dated = pool.filter((race) => race.date).sort((a, b) => a.date.localeCompare(b.date));
    const first = dated[0];
    const last = dated[dated.length - 1];
    const fromStrava = races.filter((race) => !officialResult(race)).length;
    els.lede.textContent = dated.length
      ? "Fastest official finish in each distance. The archive runs from " + first.race_name + " on " + formatDate(first.date) + " to " + last.race_name + " on " + formatDate(last.date) + ". " + fromStrava + " races added from Strava use an elapsed time: they stay in the list, with a from Strava badge, and out of these bests. Choose a marker to list only that distance."
      : "Fastest official finish in each distance.";
  }

  function renderPosts() {
    els.posts.replaceChildren();
    bests.forEach((race) => {
      const button = el("button", "post");
      button.type = "button";
      const pressed = state.distance === race.distance;
      button.setAttribute("aria-pressed", String(pressed));
      button.setAttribute(
        "aria-label",
        race.distance + ", personal best " + displayTime(race.finish_time) + ", " + race.race_name + (pressed ? ". Showing this distance. Activate to show every distance." : ". Show only this distance.")
      );
      button.append(el("span", "post-code", MARKER[race.distance] || race.distance));
      button.append(el("span", "post-name", race.distance));
      button.append(el("span", "post-time", displayTime(race.finish_time)));
      button.addEventListener("click", () => {
        if (state.distance === race.distance) {
          state.distance = "all";
          state.parkrun = false;
        } else {
          state.distance = race.distance;
          state.chartDistance = race.distance;
          state.parkrun = race.distance === "5K";
        }
        renderAll();
      });
      els.posts.append(button);
    });
  }

  function featuredRace() {
    if (state.distance !== "all") {
      return bests.find((race) => race.distance === state.distance) || null;
    }
    return bests.find((race) => race.distance === "Ironman") || bests[0] || null;
  }

  function renderBoard() {
    const race = featuredRace();
    els.board.replaceChildren();
    if (!race) {
      els.board.append(el("p", null, "No finish time is recorded for this distance."));
      return;
    }
    const head = el("div", "board-head");
    const copy = el("div");
    copy.append(el("h3", null, race.distance));
    copy.append(el("p", "board-race", race.race_name));
    const bits = [formatDate(race.date)];
    if (race.distance_km != null) bits.push(String(race.distance_km) + " km in the source");
    if (race.discipline) bits.push(race.discipline);
    if (isParkrun(race)) bits.push("parkrun");
    if (race.position) bits.push(race.position);
    copy.append(el("p", "board-meta", bits.join(" · ")));
    head.append(copy);
    head.append(el("p", "board-time", displayTime(race.finish_time)));
    els.board.append(head);

    if (race.distance === "Ironman" || race.distance === "70.3") {
      const splits = SPLIT_FIELDS.map(([key, label, color]) => ({
        key,
        label,
        color,
        text: race[key],
        seconds: parseClock(race[key]),
      })).filter((split) => split.text && split.seconds);
      if (splits.length) {
        const wrap = el("div", "splits");
        const bar = el("div", "split-bar");
        bar.setAttribute("aria-hidden", "true");
        const total = splits.reduce((sum, split) => sum + split.seconds, 0);
        splits.forEach((split) => {
          const segment = document.createElement("i");
          segment.style.width = (split.seconds / total) * 100 + "%";
          segment.style.setProperty("--segment", split.color);
          segment.title = split.label + " " + split.text;
          bar.append(segment);
        });
        const key = el("div", "split-key");
        splits.forEach((split) => {
          const item = el("p");
          item.style.setProperty("--segment", split.color);
          const name = el("span");
          const swatch = el("i", "swatch");
          swatch.style.setProperty("--segment", split.color);
          name.append(swatch, document.createTextNode(split.label));
          item.append(name, el("strong", null, split.text));
          key.append(item);
        });
        wrap.append(bar, key);
        const transitions = ["t1", "t2"].filter((keyName) => race[keyName]).map((keyName) => keyName.toUpperCase() + " " + race[keyName]);
        if (transitions.length) wrap.append(el("p", "transitions", transitions.join(" · ")));
        els.board.append(wrap);
      }
    }

    if (race.data_issues) {
      const note = el("p", "data-note");
      note.append(el("strong", null, "Data note. "));
      note.append(document.createTextNode(race.data_issues));
      els.board.append(note);
    }
  }

  function fieldRow(list, label, value, options) {
    const opts = options || {};
    list.append(el("dt", null, label));
    const dd = el("dd", opts.blank ? "is-blank" : null);
    if (opts.href) dd.append(externalLink(opts.href, opts.linkText || value));
    else if (opts.rich) appendRich(dd, value);
    else dd.textContent = value;
    list.append(dd);
  }

  function renderDetail(race) {
    const panel = el("div", "detail");
    panel.id = "detail-" + race._id;
    const facts = el("div");
    facts.append(el("h3", null, "Recorded fields"));
    const list = el("dl");
    const blanks = el("dl");
    const rows = [
      ["Date", race.date ? formatDate(race.date) : null],
      ["Discipline", race.discipline],
      ["Distance", race.distance],
      ["Distance km", race.distance_km != null ? String(race.distance_km) : null],
      ["Distance (original)", race.distance_original],
      ["Event type", race.event_type],
      ["Race category", race.race_category],
      ["Finish time", race.finish_time ? displayTime(race.finish_time) : null],
      ["Swim", race.swim],
      ["T1", race.t1],
      ["Bike", race.bike],
      ["T2", race.t2],
      ["Run", race.run],
      ["Location", race.location],
      ["Position / placing", race.position],
      ["Source", race.source === STRAVA_SOURCE ? "Strava (elapsed time)" : race.source],
      ["Notion title", race.notion_title],
      ["Raw times", race.raw_times],
    ];
    rows.forEach(([label, value]) => {
      if (value || label === "Finish time") fieldRow(list, label, value || "No time", { blank: !value });
      else fieldRow(blanks, label, "Not recorded", { blank: true });
    });
    facts.append(list);
    if (blanks.childElementCount) {
      const extra = el("details");
      const summary = el("summary", null, "Fields with nothing recorded");
      extra.append(summary, blanks);
      facts.append(extra);
    }
    panel.append(facts);

    const side = el("div");
    side.append(el("h3", null, "Notes and links"));
    if (race.notes) {
      const notes = el("p", "notes");
      appendRich(notes, race.notes);
      side.append(notes);
    } else {
      side.append(el("p", "data-note", "No notes recorded."));
    }
    const activityIds = [];
    const seenIds = new Set();
    (race.strava_activity_ids || []).forEach((id) => {
      const key = String(id);
      if (!key || seenIds.has(key)) return;
      seenIds.add(key);
      activityIds.push(key);
    });
    const links = el("ul", "links");
    activityIds.forEach((id, index) => {
      const item = el("li");
      const link = externalLink("https://www.strava.com/activities/" + id, activityIds.length > 1 ? "Strava " + (index + 1) : "Strava");
      link.setAttribute("aria-label", "Strava activity " + id);
      item.append(link);
      links.append(item);
    });
    const linkIsListed = activityIds.some((id) => String(race.link || "").indexOf("/activities/" + id) !== -1);
    if (race.link && !linkIsListed) {
      const item = el("li");
      const label = /strava\.com/i.test(race.link) ? "Strava" : /parkrun\./i.test(race.link) ? "Parkrun" : "Link";
      item.append(externalLink(race.link, label));
      links.append(item);
    }
    if (race.strava_bike) {
      const item = el("li");
      item.append(externalLink(race.strava_bike, race.strava_bike_label || "Strava bike"));
      links.append(item);
    }
    if (race.notion_page) {
      const item = el("li");
      item.append(externalLink(race.notion_page, "Notion"));
      links.append(item);
    }
    if (links.childElementCount) side.append(links);
    if (!officialResult(race)) {
      const elapsed = el("p", "data-note");
      elapsed.append(el("strong", null, "From Strava. "));
      elapsed.append(document.createTextNode("This finish time is the Strava elapsed time, not an official result, so it is left out of the personal bests."));
      side.append(elapsed);
    }
    if (race.data_issues) {
      const note = el("p", "data-note");
      note.append(el("strong", null, "Data note. "));
      note.append(document.createTextNode(race.data_issues));
      side.append(note);
    }
    panel.append(side);
    return panel;
  }

  function renderList(options) {
    const rows = filteredRaces();
    if (!rows.length) {
      const empty = el("div", "empty");
      empty.append(el("p", null, "No races match this search and these filters."));
      const clear = el("button", null, "Clear filters");
      clear.type = "button";
      clear.addEventListener("click", () => {
        state.discipline = "all";
        state.distance = "all";
        state.year = "all";
        state.source = "all";
        state.parkrun = false;
        state.query = "";
        els.query.value = "";
        renderAll();
      });
      empty.append(clear);
      els.list.replaceChildren(empty);
      els.span.textContent = "Nothing in this view.";
    } else {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const spanText = (first.race_name || "Untitled") + ", " + formatDate(first.date) + " through " + (last.race_name || "Untitled") + ", " + formatDate(last.date);
      els.span.textContent = rows.length + (rows.length === 1 ? " race. " : " races. ") + spanText + ".";

      const list = el("ul", "race-list");
      rows.forEach((race) => {
        const item = el("li");
        const open = state.openId === race._id;
        const button = el("button", "race-button");
        button.type = "button";
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-controls", "detail-" + race._id);
        button.append(el("span", "c-date", formatDate(race.date)));
        const name = el("span", "c-name", race.race_name || "Untitled row");
        if (!officialResult(race)) name.append(el("span", "tag", "from Strava"));
        button.append(name);
        button.append(el("span", "c-dist", race.distance || "No distance"));
        button.append(el("span", "c-disc", race.discipline || "No discipline"));
        const time = el("span", "c-time" + (race.finish_time ? "" : " is-missing"), race.finish_time ? displayTime(race.finish_time) : "No time");
        button.append(time);
        button.append(chevron());
        button.addEventListener("click", () => {
          state.openId = state.openId === race._id ? null : race._id;
          renderList({ focusId: race._id });
        });
        item.append(button);
        if (open) item.append(renderDetail(race));
        list.append(item);
      });
      els.list.replaceChildren(list);
    }

    els.distance.value = state.distance;
    els.disciplines.querySelectorAll("button").forEach((button) => {
      const name = button.textContent === "All disciplines" ? "all" : button.textContent;
      button.setAttribute("aria-pressed", String(state.discipline === name));
    });
    els.posts.querySelectorAll(".post").forEach((button, index) => {
      const race = bests[index];
      const pressed = state.distance === race.distance;
      button.setAttribute("aria-pressed", String(pressed));
    });
    if (options && options.focusId != null) {
      const focused = els.list.querySelector('[aria-controls="detail-' + options.focusId + '"]');
      if (focused) focused.focus();
    }
  }

  function activeDiscipline() {
    if (state.distance === "all") return null;
    const match = bests.find((race) => race.distance === state.distance);
    return match ? match.discipline : null;
  }

  function renderYearTable(years, disciplines, counts) {
    const list = el("ul", "plain-list");
    years.forEach((year) => {
      const parts = disciplines
        .filter((name) => counts[year][name])
        .map((name) => name + " " + counts[year][name]);
      list.append(el("li", null, parts.length ? year + ": " + parts.join(", ") : year + ": 0"));
    });
    els.yearTable.replaceChildren(list);
  }

  function renderCharts() {
    const pool = chartRows();
    const highlight = state.discipline !== "all" ? state.discipline : activeDiscipline();
    const yearsPresent = pool.map((race) => (race.date || "").slice(0, 4)).filter(Boolean).map(Number);
    const min = yearsPresent.length ? Math.min.apply(null, yearsPresent) : null;
    const max = yearsPresent.length ? Math.max.apply(null, yearsPresent) : null;
    const years = [];
    if (min != null) {
      for (let year = min; year <= max; year += 1) years.push(String(year));
    }
    const disciplines = uniqueSorted(pool.map((race) => race.discipline || "Unspecified"), DISCIPLINE_ORDER);
    const counts = {};
    years.forEach((year) => {
      counts[year] = {};
    });
    pool.forEach((race) => {
      const year = (race.date || "").slice(0, 4);
      if (!counts[year]) return;
      const name = race.discipline || "Unspecified";
      counts[year][name] = (counts[year][name] || 0) + 1;
    });
    renderYearTable(years, disciplines, counts);
    const quiet = highlight ? " The " + highlight + " series is the distance in view. Other disciplines stay on the chart, quieter." : "";
    const sourceNote = state.source === STRAVA_SOURCE
      ? " Showing races added from Strava."
      : state.source === "all"
        ? " Official results and races added from Strava."
        : " Showing " + state.source + " races.";
    els.yearCaption.textContent = "Races in the archive, including starts with no finish time." + sourceNote + quiet;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.Chart) {
      els.yearFallback.hidden = false;
      els.progressFallback.hidden = false;
      els.yearFallback.textContent = "The chart library did not load. The counts and the time list under each chart still have the numbers.";
      els.progressFallback.textContent = "The chart library did not load.";
    } else {
      els.yearFallback.hidden = true;
      const datasets = disciplines.map((name) => {
        const color = DISCIPLINE_COLOR[name] || "#5C564C";
        const alpha = !highlight || highlight === name ? 1 : 0.28;
        return {
          label: name,
          data: years.map((year) => counts[year][name] || 0),
          backgroundColor: hexAlpha(color, alpha),
          borderWidth: 0,
        };
      });
      const yearData = { labels: years, datasets };
      const yearOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 600, easing: "easeOutQuart" },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#14241C", font: { family: "Barlow" } },
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0, color: "#14241C", font: { family: "Barlow" } },
            grid: { color: "rgba(20, 36, 28, 0.12)" },
          },
        },
        plugins: {
          legend: { labels: { color: "#14241C", font: { family: "Barlow", size: 12 }, boxWidth: 12 } },
        },
      };
      if (yearChart) yearChart.destroy();
      yearChart = new Chart(document.getElementById("year-chart"), { type: "bar", data: yearData, options: yearOptions });
    }

    const series = progressionRows()
      .filter((race) => race.distance === state.chartDistance && race.finish_seconds != null && race.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (els.progressCaption) {
      els.progressCaption.textContent = state.source === STRAVA_SOURCE
        ? "Lower is a faster finish, and the scale starts near the data. These are Strava elapsed times, not official results."
        : "Lower is a faster finish, and the scale starts near the data. Official results only, so a Strava elapsed time stays off this line.";
    }
    const progressList = el("ul", "plain-list");
    if (!series.length) {
      progressList.append(el("li", null, "No finish time for " + state.chartDistance + "."));
    } else {
      series.forEach((race) => {
        progressList.append(el("li", null, formatDate(race.date) + " — " + race.race_name + " — " + displayTime(race.finish_time)));
      });
    }
    els.progressTable.replaceChildren(progressList);

    if (!window.Chart) return;
    const color = DISCIPLINE_COLOR[(series[0] && series[0].discipline) || "Run"] || "#16352C";
    const progressData = {
      labels: series.map((race) => formatDate(race.date)),
      datasets: [
        {
          label: state.chartDistance,
          data: series.map((race) => race.finish_seconds),
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointStyle: "rect",
          pointRadius: 5,
          tension: 0,
          fill: false,
        },
      ],
    };
    const names = series.map((race) => race.race_name + " — " + displayTime(race.finish_time));
    const underHour = series.length > 0 && series.every((race) => race.finish_seconds < 3600);
    const progressOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduce ? false : { duration: 700, easing: "easeOutQuart" },
      scales: {
        x: {
          ticks: { color: "#14241C", font: { family: "Barlow", size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
          grid: { color: "rgba(20, 36, 28, 0.08)" },
        },
        y: {
          ticks: {
            color: "#14241C",
            font: { family: "Barlow" },
            callback: (value) => clockLabel(value, underHour),
          },
          grid: { color: "rgba(20, 36, 28, 0.12)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => names[item.dataIndex] || clockLabel(item.parsed.y),
          },
        },
      },
    };
    if (!series.length) {
      if (progressChart) {
        progressChart.destroy();
        progressChart = null;
      }
      els.progressFallback.hidden = false;
      els.progressFallback.textContent = "No finish time is recorded for " + state.chartDistance + ".";
      return;
    }
    els.progressFallback.hidden = true;
    if (progressChart) progressChart.destroy();
    progressChart = new Chart(document.getElementById("progress-chart"), { type: "line", data: progressData, options: progressOptions });
  }

  function renderAll() {
    renderChrome();
    renderPosts();
    renderBoard();
    renderList();
    renderCharts();
  }

  function bind() {
    document.getElementById("filters").addEventListener("submit", (event) => event.preventDefault());
    els.query.addEventListener("input", () => {
      state.query = els.query.value;
      renderList();
    });
    els.distance.addEventListener("change", () => {
      state.distance = els.distance.value;
      state.parkrun = state.distance === "5K";
      if (state.distance !== "all") state.chartDistance = state.distance;
      renderAll();
    });
    els.year.addEventListener("change", () => {
      state.year = els.year.value;
      renderList();
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      renderList();
    });
    els.source.addEventListener("change", () => {
      state.source = els.source.value;
      renderAll();
    });
    els.parkrun.addEventListener("click", () => {
      state.parkrun = !state.parkrun;
      if (state.parkrun) {
        state.distance = "5K";
        state.chartDistance = "5K";
      } else if (state.distance === "5K") {
        state.distance = "all";
      }
      renderAll();
    });
    els.chartDistance.addEventListener("change", () => {
      state.chartDistance = els.chartDistance.value;
      renderCharts();
    });
    els.posts.addEventListener("keydown", (event) => {
      const buttons = Array.from(els.posts.querySelectorAll(".post"));
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = event.key === "ArrowRight" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
    });

    const links = Array.from(document.querySelectorAll(".shell nav a"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => link.removeAttribute("aria-current"));
          const current = document.querySelector('.shell nav a[href="#' + entry.target.id + '"]');
          if (current) current.setAttribute("aria-current", "true");
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    ["bests", "races", "charts"].forEach((id) => observer.observe(document.getElementById(id)));
  }

  function showSections() {
    els.status.hidden = true;
    els.bests.hidden = false;
    els.races.hidden = false;
    els.charts.hidden = false;
  }

  fetch("data/races.json?v=" + Date.now())
    .then((response) => {
      if (!response.ok) throw new Error("Could not read data/races.json (" + response.status + ").");
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("data/races.json is not a list of races.");
      races = data.map((race, index) => Object.assign({ _id: index }, race));
      bests = personalBests(races);
      showSections();
      bind();
      renderAll();
    })
    .catch((error) => {
      els.status.textContent = error.message + " Serve this folder with a local web server, then open the site from that address.";
    });
})();
