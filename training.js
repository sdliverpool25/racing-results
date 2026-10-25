(function () {
  const A = window.Archive;
  const PAGE_SIZE = 40;
  const state = {
    range: "12m",
    unit: "hours",
    query: "",
    type: "all",
    year: "all",
    raceOnly: false,
    sort: "date-desc",
    page: 0,
  };

  const els = {
    status: document.getElementById("status"),
    bests: document.getElementById("bests"),
    bestsLede: document.getElementById("bests-lede"),
    posts: document.getElementById("bests-posts"),
    volume: document.getElementById("volume"),
    volumeLede: document.getElementById("volume-lede"),
    yearRange: document.getElementById("year-range"),
    summary: document.getElementById("range-summary"),
    weekCaption: document.getElementById("week-caption"),
    monthCaption: document.getElementById("month-caption"),
    yoyCaption: document.getElementById("yoy-caption"),
    trendCaption: document.getElementById("trend-caption"),
    fallback: document.getElementById("chart-fallback"),
    breakdown: document.getElementById("breakdown"),
    matrix: document.getElementById("matrix"),
    activities: document.getElementById("activities"),
    activitiesLede: document.getElementById("activities-lede"),
    query: document.getElementById("activity-query"),
    type: document.getElementById("activity-type"),
    year: document.getElementById("activity-year"),
    sort: document.getElementById("activity-sort"),
    raceOnly: document.getElementById("race-only"),
    table: document.getElementById("activity-table"),
    pager: document.getElementById("pager"),
  };

  const charts = {};
  let activities = [];
  let hrefTemplate = "https://www.strava.com/activities/{id}";
  let weekly = [];
  let monthly = [];
  let yearly = [];
  let meta = {};
  let raceWeeks = new Set();
  let raceMonths = new Set();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function bounds() {
    const first = meta.first_date;
    const last = meta.last_date;
    if (state.range === "all") return { start: first, end: last, weeklyCap: 52, label: "All time" };
    if (state.range.indexOf("year:") === 0) {
      const year = state.range.slice(5);
      return { start: year + "-01-01", end: year + "-12-31", label: year };
    }
    if (state.range === "12w") {
      const endMonday = A.isoMonday(last);
      return { start: A.addDays(endMonday, -7 * 11), end: last, label: "Last 12 weeks" };
    }
    const endMonth = last.slice(0, 7);
    const startMonth = A.shiftMonth(endMonth, -11);
    return { start: startMonth + "-01", end: last, label: "Last 12 months" };
  }

  function weeksIn(range) {
    let periods = A.eachPeriod(range.start, range.end, "week");
    if (range.weeklyCap) periods = periods.slice(-range.weeklyCap);
    const allowed = new Set(periods);
    return { periods: periods, rows: weekly.filter((row) => allowed.has(row.period)) };
  }

  function monthsIn(range) {
    const periods = A.eachPeriod(range.start, range.end, "month");
    const allowed = new Set(periods);
    return { periods: periods, rows: monthly.filter((row) => allowed.has(row.period)) };
  }

  function stackedDatasets(periods, rows, raceSet) {
    const byType = {};
    rows.forEach((row) => {
      if (row.type === "All") return;
      const key = A.stackKey(row.type);
      if (!byType[key]) byType[key] = {};
      byType[key][row.period] = (byType[key][row.period] || 0) + Number(row[state.unit] || 0);
    });
    const types = A.STACK_SPORTS.concat(["Other"]).filter((type) => {
      const bag = byType[type];
      if (!bag) return false;
      return periods.some((period) => bag[period]);
    });
    const datasets = types.map((type) => ({
      type: "bar",
      label: type,
      data: periods.map((period) => A.round(byType[type][period] || 0, 2)),
      backgroundColor: A.SPORT_COLOR[type] || A.SPORT_COLOR.Other,
      stack: "volume",
      order: 2,
      borderWidth: 0,
    }));
    const totals = periods.map((period) => types.reduce((sum, type) => sum + (byType[type][period] || 0), 0));
    const hasRace = periods.some((period) => raceSet.has(period));
    if (hasRace) {
      datasets.push({
        type: "line",
        label: "Race",
        data: periods.map((period, index) => (raceSet.has(period) ? A.round(totals[index], 2) : null)),
        showLine: false,
        pointStyle: "rectRot",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "#F0C400",
        pointBorderColor: "#14241C",
        pointBorderWidth: 1,
        stack: "marker",
        order: 1,
        borderWidth: 0,
      });
    }
    return datasets;
  }

  function unitSuffix() {
    return state.unit === "hours" ? " h" : " km";
  }

  function chartOptions(stacked, reduce) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduce ? false : { duration: 400, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          stacked: stacked,
          ticks: { color: "#14241C", font: { family: "Barlow", size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { display: false },
        },
        y: {
          stacked: stacked,
          beginAtZero: true,
          ticks: {
            color: "#14241C",
            font: { family: "Barlow" },
            callback: (value) => A.fmt(value, 0),
          },
          grid: { color: "rgba(20, 36, 28, 0.12)" },
        },
      },
      plugins: {
        legend: { labels: { color: "#14241C", font: { family: "Barlow", size: 12 }, boxWidth: 12 } },
        tooltip: {
          filter: (item) => item.parsed.y != null,
          callbacks: {
            label: (item) => {
              if (item.dataset.label === "Race") return "Race day";
              return item.dataset.label + ": " + A.fmt(item.parsed.y, 1) + unitSuffix();
            },
          },
        },
      },
    };
  }

  function paint(key, canvas, config, count) {
    const frame = canvas.parentElement;
    const scroller = frame.parentElement;
    const needed = count * 18;
    const available = scroller.clientWidth || 320;
    frame.style.width = needed > available ? needed + "px" : "100%";
    if (charts[key]) charts[key].destroy();
    charts[key] = new Chart(canvas, config);
  }

  function sumAll(rows) {
    return rows.reduce(
      (acc, row) => {
        if (row.type !== "All") return acc;
        acc.count += row.count || 0;
        acc.km += row.km || 0;
        acc.hours += row.hours || 0;
        return acc;
      },
      { count: 0, km: 0, hours: 0 }
    );
  }

  function renderPressed() {
    document.querySelectorAll("[data-range]").forEach((button) => {
      const on = button.getAttribute("data-range") === state.range;
      button.setAttribute("aria-pressed", String(on));
    });
    document.querySelectorAll("[data-unit]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-unit") === state.unit));
    });
    els.yearRange.value = state.range.indexOf("year:") === 0 ? state.range.slice(5) : "";
  }

  function renderVolume() {
    const range = bounds();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderPressed();
    const week = weeksIn(range);
    const month = monthsIn(range);
    const weekTotals = sumAll(week.rows);
    const monthTotals = sumAll(month.rows);
    const summaryTotals = state.range === "all" || state.range.indexOf("year:") === 0 ? sumAll(yearly.filter((row) => {
      if (state.range === "all") return true;
      return row.period === state.range.slice(5);
    })) : state.range === "12w" ? weekTotals : monthTotals;
    els.summary.textContent = range.label + " · " + A.fmt(summaryTotals.hours, 1) + " h · " + A.fmt(summaryTotals.km, 0) + " km · " + A.fmt(summaryTotals.count, 0) + " activities. A yellow diamond marks a period that includes a race.";

    const weekNote = range.weeklyCap ? " The weekly chart keeps the latest " + range.weeklyCap + " weeks so the full history stays readable." : "";
    els.weekCaption.textContent = "Stacked " + (state.unit === "hours" ? "moving hours" : "kilometres") + " by sport." + weekNote;
    els.monthCaption.textContent = "Stacked " + (state.unit === "hours" ? "moving hours" : "kilometres") + " by sport for " + range.label.toLowerCase() + ".";

    if (!window.Chart) {
      els.fallback.hidden = false;
      els.fallback.textContent = "The chart library did not load. The sport-by-year table still has the totals.";
      return;
    }
    els.fallback.hidden = true;
    paint("week", document.getElementById("week-chart"), {
      type: "bar",
      data: {
        labels: week.periods.map((period) => A.periodLabel(period, "week")),
        datasets: stackedDatasets(week.periods, week.rows, raceWeeks),
      },
      options: chartOptions(true, reduce || week.periods.length > 80),
    }, week.periods.length);
    paint("month", document.getElementById("month-chart"), {
      type: "bar",
      data: {
        labels: month.periods.map((period) => A.periodLabel(period, "month")),
        datasets: stackedDatasets(month.periods, month.rows, raceMonths),
      },
      options: chartOptions(true, reduce || month.periods.length > 80),
    }, month.periods.length);
  }

  function renderYoy() {
    const years = [];
    const seen = new Set();
    yearly.forEach((row) => {
      if (seen.has(row.period)) return;
      seen.add(row.period);
      years.push(row.period);
    });
    years.sort();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    els.yoyCaption.textContent = "Every year in the log, in " + (state.unit === "hours" ? "moving hours" : "kilometres") + ". Smaller sports are grouped as Other. This chart stays on the full history when the range above changes.";
    if (!window.Chart) return;
    paint("yoy", document.getElementById("yoy-chart"), {
      type: "bar",
      data: {
        labels: years,
        datasets: stackedDatasets(years, yearly, new Set()).filter((dataset) => dataset.type === "bar"),
      },
      options: chartOptions(false, reduce),
    }, Math.max(years.length, years.length * 4));
  }

  function trendPoints(range) {
    const grain = state.range === "12w" ? "week" : "month";
    const periods = grain === "week" ? weeksIn(range).periods : monthsIn(range).periods;
    const bags = {};
    periods.forEach((period) => {
      bags[period] = { km: 0, moving: 0, hrSum: 0, hrN: 0, race: false };
    });
    activities.forEach((activity) => {
      if (activity.type !== "Run") return;
      if (activity.date < range.start || activity.date > range.end) return;
      const key = grain === "week" ? A.isoMonday(activity.date) : activity.date.slice(0, 7);
      const bag = bags[key];
      if (!bag) return;
      if (activity.km && activity.moving_s) {
        bag.km += activity.km;
        bag.moving += activity.moving_s;
      }
      if (activity.avg_hr != null) {
        bag.hrSum += activity.avg_hr;
        bag.hrN += 1;
      }
      if (activity.race_id) bag.race = true;
    });
    return {
      grain: grain,
      rows: periods.map((period) => {
        const bag = bags[period];
        return {
          period: period,
          pace: bag.km ? bag.moving / bag.km : null,
          hr: bag.hrN ? bag.hrSum / bag.hrN : null,
          race: bag.race,
        };
      }),
    };
  }

  function renderTrend() {
    const range = bounds();
    const trend = trendPoints(range);
    const grainName = trend.grain === "week" ? "week" : "month";
    els.trendCaption.textContent = "Average moving pace and average heart rate of runs, by " + grainName + ", for " + range.label.toLowerCase() + ". Lower pace is faster. A yellow diamond is a " + grainName + " with a run race. Whole-activity pace, not a split.";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.Chart) return;
    const rows = trend.rows;
    paint("trend", document.getElementById("trend-chart"), {
      type: "line",
      data: {
        labels: rows.map((row) => A.periodLabel(row.period, trend.grain)),
        datasets: [
          {
            type: "line",
            label: "Pace",
            data: rows.map((row) => (row.pace == null ? null : A.round(row.pace, 1))),
            borderColor: "#16352C",
            backgroundColor: "#16352C",
            borderWidth: 2,
            spanGaps: false,
            tension: 0.15,
            pointRadius: rows.map((row) => (row.race ? 6 : 3)),
            pointStyle: rows.map((row) => (row.race ? "rectRot" : "circle")),
            pointBackgroundColor: rows.map((row) => (row.race ? "#F0C400" : "#16352C")),
            pointBorderColor: "#14241C",
            pointBorderWidth: 1,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "Avg heart rate",
            data: rows.map((row) => (row.hr == null ? null : A.round(row.hr, 0))),
            borderColor: "#B23A2E",
            backgroundColor: "#B23A2E",
            borderWidth: 2,
            spanGaps: false,
            pointRadius: 2,
            tension: 0.15,
            yAxisID: "hr",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce || rows.length > 80 ? false : { duration: 400 },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: { color: "#14241C", font: { family: "Barlow", size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { display: false },
          },
          y: {
            position: "left",
            ticks: { color: "#14241C", font: { family: "Barlow" }, callback: (value) => A.paceLabel(value) },
            grid: { color: "rgba(20, 36, 28, 0.12)" },
            title: { display: true, text: "min/km", color: "#14241C", font: { family: "Barlow", size: 12 } },
          },
          hr: {
            position: "right",
            beginAtZero: false,
            ticks: { color: "#14241C", font: { family: "Barlow" } },
            grid: { drawOnChartArea: false },
            title: { display: true, text: "bpm", color: "#14241C", font: { family: "Barlow", size: 12 } },
          },
        },
        plugins: {
          legend: { labels: { color: "#14241C", font: { family: "Barlow", size: 12 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (item) => {
                if (item.dataset.label === "Pace") {
                  const race = rows[item.dataIndex] && rows[item.dataIndex].race ? " · race" : "";
                  return "Pace " + A.paceLabel(item.parsed.y) + "/km" + race;
                }
                return "Avg HR " + A.fmt(item.parsed.y, 0);
              },
            },
          },
        },
      },
    }, rows.length);
  }

  function renderMatrix() {
    const years = [];
    const seen = new Set();
    yearly.forEach((row) => {
      if (row.type === "All" || seen.has(row.period)) return;
      seen.add(row.period);
      years.push(row.period);
    });
    years.sort();
    const byType = {};
    yearly.forEach((row) => {
      if (row.type === "All") return;
      if (!byType[row.type]) byType[row.type] = {};
      byType[row.type][row.period] = row;
    });
    const types = Object.keys(byType).sort((a, b) => {
      const hours = (type) => years.reduce((sum, year) => sum + ((byType[type][year] && byType[type][year].hours) || 0), 0);
      return hours(b) - hours(a);
    });
    const table = el("table", "data-table matrix");
    const head = el("thead");
    const headRow = el("tr");
    headRow.append(el("th", null, "Sport"));
    years.forEach((year) => headRow.append(el("th", "num", year)));
    headRow.append(el("th", "num", "Total"));
    head.append(headRow);
    const body = el("tbody");
    types.forEach((type) => {
      const row = el("tr");
      row.append(el("th", null, type));
      let km = 0;
      let hours = 0;
      years.forEach((year) => {
        const cell = byType[type][year];
        const td = el("td", "num");
        if (!cell) td.textContent = "—";
        else {
          km += cell.km || 0;
          hours += cell.hours || 0;
          td.append(el("span", "cell-main", A.fmt(cell.km, 0) + " km"));
          td.append(el("span", "cell-sub", A.fmt(cell.hours, 1) + " h"));
          td.title = (cell.count || 0) + " activities";
        }
        row.append(td);
      });
      const total = el("td", "num");
      total.append(el("span", "cell-main", A.fmt(km, 0) + " km"));
      total.append(el("span", "cell-sub", A.fmt(hours, 1) + " h"));
      row.append(total);
      body.append(row);
    });
    table.append(head, body);
    els.matrix.replaceChildren(table);
  }

  function renderBests(bests) {
    els.bestsLede.textContent = "Fastest whole-activity pace for a run at least this long. Ranked by moving time divided by distance. These are not official race times and not Strava best efforts.";
    els.posts.replaceChildren();
    (bests.rows || []).forEach((row) => {
      const link = el("a", "post");
      link.href = A.activityHref(hrefTemplate, row.activity_id);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(el("span", "post-code", row.label));
      link.append(el("span", "post-time", row.pace));
      link.append(el("span", "post-name", "whole-activity pace"));
      link.append(el("span", "post-name", row.name));
      link.append(el("span", "post-name", A.formatDate(row.date)));
      els.posts.append(link);
    });
  }

  function filteredActivities() {
    const query = state.query.trim().toLowerCase();
    return activities
      .filter((activity) => {
        if (state.type !== "all" && activity.type !== state.type) return false;
        if (state.year !== "all" && activity.date.slice(0, 4) !== state.year) return false;
        if (state.raceOnly && !activity.race_id) return false;
        if (!query) return true;
        return String(activity.name || "").toLowerCase().indexOf(query) !== -1;
      })
      .sort((a, b) => {
        if (state.sort === "date-asc") return a.date.localeCompare(b.date) || (a.hour || 0) - (b.hour || 0);
        if (state.sort === "km-desc") return (b.km || 0) - (a.km || 0) || b.date.localeCompare(a.date);
        if (state.sort === "hours-desc") return (b.moving_s || 0) - (a.moving_s || 0) || b.date.localeCompare(a.date);
        return b.date.localeCompare(a.date) || (b.hour || 0) - (a.hour || 0);
      });
  }

  function renderActivities() {
    const rows = filteredActivities();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > pages - 1) state.page = pages - 1;
    if (state.page < 0) state.page = 0;
    const start = state.page * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);
    const table = el("table", "data-table activity-table");
    const head = el("thead");
    const headRow = el("tr");
    ["Date", "Activity", "Sport", "Km", "Moving", "Avg HR", "Strava"].forEach((label) => {
      const cell = el("th", label === "Km" || label === "Moving" || label === "Avg HR" ? "num" : null);
      cell.textContent = label;
      headRow.append(cell);
    });
    head.append(headRow);
    const body = el("tbody");
    if (!slice.length) {
      const empty = el("tr");
      const cell = el("td", null, "No activities match this search and these filters.");
      cell.colSpan = 7;
      empty.append(cell);
      body.append(empty);
    }
    slice.forEach((activity) => {
      const row = el("tr");
      row.append(el("td", null, A.formatDate(activity.date)));
      const name = el("td", "wrap-name");
      name.append(document.createTextNode(activity.name || "Untitled"));
      if (activity.race_id) name.append(el("span", "tag", "Race"));
      row.append(name);
      row.append(el("td", null, activity.type || "—"));
      row.append(el("td", "num", activity.km == null ? "—" : A.fmt(activity.km, 1)));
      row.append(el("td", "num", A.formatDuration(activity.moving_s)));
      row.append(el("td", "num", activity.avg_hr == null ? "—" : String(Math.round(activity.avg_hr))));
      const linkCell = el("td");
      if (/^\d+$/.test(String(activity.id))) {
        const link = el("a", null, "Strava");
        link.href = A.activityHref(hrefTemplate, activity.id);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        linkCell.append(link);
      } else {
        // Rows added from TrainingPeaks (id "tp-…") have no Strava activity to link to.
        linkCell.append(el("span", null, "TrainingPeaks"));
      }
      row.append(linkCell);
      body.append(row);
    });
    table.append(head, body);
    els.table.replaceChildren(table);

    els.pager.replaceChildren();
    const label = el("p", "pager-label", rows.length ? start + 1 + "–" + (start + slice.length) + " of " + rows.length : "0 activities");
    const prev = el("button", "choice", "Previous");
    prev.type = "button";
    prev.disabled = state.page === 0;
    prev.addEventListener("click", () => {
      state.page -= 1;
      renderActivities();
    });
    const next = el("button", "choice", "Next");
    next.type = "button";
    next.disabled = state.page >= pages - 1;
    next.addEventListener("click", () => {
      state.page += 1;
      renderActivities();
    });
    els.pager.append(prev, label, next);
  }

  function fillFilters() {
    const types = [];
    const typeSet = new Set(activities.map((activity) => activity.type).filter(Boolean));
    A.SPORT_ORDER.forEach((type) => {
      if (typeSet.has(type)) {
        types.push(type);
        typeSet.delete(type);
      }
    });
    Array.from(typeSet).sort().forEach((type) => types.push(type));
    els.type.replaceChildren();
    const allTypes = el("option", null, "All sports");
    allTypes.value = "all";
    els.type.append(allTypes);
    types.forEach((type) => {
      const option = el("option", null, type);
      option.value = type;
      els.type.append(option);
    });
    const years = [];
    const yearSet = new Set();
    activities.forEach((activity) => yearSet.add(activity.date.slice(0, 4)));
    Array.from(yearSet).sort().forEach((year) => years.push(year));
    els.year.replaceChildren();
    const allYears = el("option", null, "All years");
    allYears.value = "all";
    els.year.append(allYears);
    years.forEach((year) => {
      const option = el("option", null, year);
      option.value = year;
      els.year.append(option);
    });
    els.yearRange.replaceChildren();
    const blank = el("option", null, "Choose a year");
    blank.value = "";
    els.yearRange.append(blank);
    years.forEach((year) => {
      const option = el("option", null, year);
      option.value = year;
      els.yearRange.append(option);
    });
  }

  function show() {
    els.status.hidden = true;
    els.bests.hidden = false;
    els.volume.hidden = false;
    els.breakdown.hidden = false;
    els.activities.hidden = false;
  }

  function bind() {
    document.getElementById("activity-filters").addEventListener("submit", (event) => event.preventDefault());
    document.querySelector("[aria-label='Date range']").addEventListener("click", (event) => {
      const button = event.target.closest("[data-range]");
      if (!button) return;
      state.range = button.getAttribute("data-range");
      renderVolume();
      renderTrend();
    });
    document.querySelector("[aria-label='Unit']").addEventListener("click", (event) => {
      const button = event.target.closest("[data-unit]");
      if (!button) return;
      state.unit = button.getAttribute("data-unit");
      renderVolume();
      renderYoy();
    });
    els.yearRange.addEventListener("change", () => {
      state.range = els.yearRange.value ? "year:" + els.yearRange.value : "all";
      renderVolume();
      renderTrend();
    });
    els.query.addEventListener("input", () => {
      state.query = els.query.value;
      state.page = 0;
      renderActivities();
    });
    els.type.addEventListener("change", () => {
      state.type = els.type.value;
      state.page = 0;
      renderActivities();
    });
    els.year.addEventListener("change", () => {
      state.year = els.year.value;
      state.page = 0;
      renderActivities();
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      state.page = 0;
      renderActivities();
    });
    els.raceOnly.addEventListener("change", () => {
      state.raceOnly = els.raceOnly.checked;
      state.page = 0;
      renderActivities();
    });
  }

  function boot(activityFile, aggregates) {
    const unpacked = A.unpackActivities(activityFile);
    activities = unpacked.activities;
    hrefTemplate = unpacked.stravaUrl;
    weekly = A.unpackTable(aggregates.weekly);
    monthly = A.unpackTable(aggregates.monthly);
    yearly = A.unpackTable(aggregates.yearly);
    meta = aggregates.meta;
    activities.forEach((activity) => {
      if (!activity.race_id) return;
      raceWeeks.add(A.isoMonday(activity.date));
      raceMonths.add(activity.date.slice(0, 7));
    });
    els.volumeLede.textContent = A.fmt(meta.activities, 0) + " activities from " + A.formatDate(meta.first_date) + " to " + A.formatDate(meta.last_date) + ". " + unpacked.duplicates + " duplicate uploads are excluded. Smaller sports sit in Other on the stacked charts.";
    els.activitiesLede.textContent = "Every kept activity, with a link to Strava. Race days are the activities linked to a race in the archive.";
    fillFilters();
    renderBests(aggregates.run_bests);
    show();
    bind();
    renderVolume();
    renderYoy();
    renderTrend();
    renderMatrix();
    renderActivities();
  }

  Promise.all([
    fetch("data/activities.json").then((response) => {
      if (!response.ok) throw new Error("Could not read data/activities.json (" + response.status + ").");
      return response.json();
    }),
    fetch("data/aggregates.json").then((response) => {
      if (!response.ok) throw new Error("Could not read data/aggregates.json (" + response.status + ").");
      return response.json();
    }),
  ])
    .then((files) => boot(files[0], files[1]))
    .catch((error) => {
      els.status.textContent = error.message + " Serve this folder with a local web server, then open the site from that address.";
    });
})();
