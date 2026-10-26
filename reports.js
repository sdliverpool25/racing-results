(function () {
  const A = window.Archive;
  const METRICS = {
    km: "Kilometres",
    hours: "Hours",
    count: "Activities",
    elevation: "Elevation (m)",
    hr: "Average heart rate",
    effort: "Relative effort",
  };
  const GROUPS = { week: "Week", month: "Month", year: "Year" };

  const els = {
    status: document.getElementById("status"),
    section: document.getElementById("report"),
    metric: document.getElementById("metric"),
    group: document.getElementById("group"),
    sport: document.getElementById("sport"),
    chartType: document.getElementById("chart-type"),
    from: document.getElementById("from"),
    to: document.getElementById("to"),
    title: document.getElementById("report-title"),
    caption: document.getElementById("report-caption"),
    fallback: document.getElementById("chart-fallback"),
    table: document.getElementById("report-table"),
    download: document.getElementById("download"),
    weekly: document.getElementById("weekly"),
    weeklyTable: document.getElementById("weekly-table"),
    weeklyCaption: document.getElementById("weekly-caption"),
    weeklyMore: document.getElementById("weekly-more"),
  };
  const WEEK_PAGE = 12;
  let weeksShown = WEEK_PAGE;
  // Bust the browser and CDN cache (GitHub Pages sends max-age=600) so new data shows at once.
  const BUST = "?v=" + Date.now();

  const state = {
    metric: "km",
    group: "month",
    sport: "all",
    chart: "bar",
    from: "",
    to: "",
  };

  let activities = [];
  let chart = null;
  let rows = [];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  }

  function readUrl(first, last) {
    const params = new URLSearchParams(window.location.search);
    if (METRICS[params.get("metric")]) state.metric = params.get("metric");
    if (GROUPS[params.get("group")]) state.group = params.get("group");
    if (params.get("chart") === "bar" || params.get("chart") === "line") state.chart = params.get("chart");
    state.sport = params.get("sport") || "all";
    state.from = validDate(params.get("from")) ? params.get("from") : A.shiftMonth(last.slice(0, 7), -11) + "-01";
    state.to = validDate(params.get("to")) ? params.get("to") : last;
    if (state.from > state.to) {
      const swap = state.from;
      state.from = state.to;
      state.to = swap;
    }
    if (state.from < first) state.from = first;
    void first;
  }

  function writeUrl() {
    const params = new URLSearchParams({
      metric: state.metric,
      group: state.group,
      sport: state.sport,
      from: state.from,
      to: state.to,
      chart: state.chart,
    });
    const next = window.location.pathname + "?" + params.toString();
    window.history.replaceState(null, "", next);
  }

  function bucketOf(date) {
    if (state.group === "year") return date.slice(0, 4);
    if (state.group === "month") return date.slice(0, 7);
    return A.isoMonday(date);
  }

  function aggregate() {
    const periods = A.eachPeriod(state.from, state.to, state.group);
    const bags = {};
    periods.forEach((period) => {
      bags[period] = { km: 0, moving: 0, count: 0, elev: 0, hrSum: 0, hrN: 0, effort: 0 };
    });
    activities.forEach((activity) => {
      if (activity.date < state.from || activity.date > state.to) return;
      if (state.sport !== "all" && activity.type !== state.sport) return;
      const bag = bags[bucketOf(activity.date)];
      if (!bag) return;
      bag.count += 1;
      bag.km += activity.km || 0;
      bag.moving += activity.moving_s || 0;
      bag.elev += activity.elev_m || 0;
      bag.effort += activity.relative_effort || 0;
      if (activity.avg_hr != null) {
        bag.hrSum += activity.avg_hr;
        bag.hrN += 1;
      }
    });
    return periods.map((period) => {
      const bag = bags[period];
      let value = 0;
      if (state.metric === "km") value = A.round(bag.km, 1);
      else if (state.metric === "hours") value = A.round(bag.moving / 3600, 2);
      else if (state.metric === "count") value = bag.count;
      else if (state.metric === "elevation") value = A.round(bag.elev, 0);
      else if (state.metric === "effort") value = A.round(bag.effort, 0);
      else value = bag.hrN ? A.round(bag.hrSum / bag.hrN, 0) : null;
      return { period: period, value: value, count: bag.count };
    });
  }

  function summary(data) {
    if (state.metric === "hr") {
      return "Heart rate is the mean of activities in each period that recorded one. Empty periods had no heart-rate sample.";
    }
    const total = data.reduce((sum, row) => sum + (row.value || 0), 0);
    const digits = state.metric === "hours" || state.metric === "km" ? 1 : 0;
    const noun = state.metric === "count" ? " activities" : state.metric === "hours" ? " h" : state.metric === "km" ? " km" : state.metric === "elevation" ? " m" : "";
    let note = "Each activity counts once.";
    if (state.metric === "hours") note = "Hours are moving time.";
    if (state.metric === "km") note = state.sport === "all" || state.sport === "Swim" ? "Swim distance is included, in kilometres." : "Distance is in kilometres.";
    if (state.metric === "elevation") note = "Elevation gain is summed.";
    if (state.metric === "effort") note = "Relative effort is summed.";
    return A.fmt(total, digits) + noun + " across " + data.length + " " + state.group + (data.length === 1 ? "" : "s") + ". " + note;
  }

  function renderTable(data) {
    const table = el("table", "data-table");
    const head = el("thead");
    const headRow = el("tr");
    headRow.append(el("th", null, "Period"));
    headRow.append(el("th", "num", METRICS[state.metric]));
    head.append(headRow);
    const body = el("tbody");
    data.forEach((row) => {
      const tr = el("tr");
      tr.append(el("td", null, row.period));
      tr.append(el("td", "num", row.value == null ? "" : String(row.value)));
      body.append(tr);
    });
    table.append(head, body);
    els.table.replaceChildren(table);
  }

  function weeklyRows() {
    const bags = {};
    activities.forEach((activity) => {
      if (activity.date < state.from || activity.date > state.to) return;
      if (state.sport !== "all" && activity.type !== state.sport) return;
      const week = A.isoMonday(activity.date);
      const bag = bags[week] || (bags[week] = { week: week, km: 0, moving: 0, count: 0, tss: 0, tssN: 0, sports: {} });
      bag.count += 1;
      bag.km += activity.km || 0;
      bag.moving += activity.moving_s || 0;
      if (activity.tss != null) {
        bag.tss += activity.tss;
        bag.tssN += 1;
      }
      const type = activity.type || "Other";
      const sport = bag.sports[type] || (bag.sports[type] = { km: 0, moving: 0 });
      sport.km += activity.km || 0;
      sport.moving += activity.moving_s || 0;
    });
    // Every Mon-Sun week in the range, including empty ones, latest first.
    return A.eachPeriod(state.from, state.to, "week").reverse().map(
      (week) => bags[week] || { week: week, km: 0, moving: 0, count: 0, tss: 0, tssN: 0, sports: {} }
    );
  }

  function sportSplit(sports) {
    const order = A.SPORT_ORDER.filter((type) => sports[type]).concat(
      Object.keys(sports).filter((type) => A.SPORT_ORDER.indexOf(type) === -1).sort()
    );
    return order
      .map((type) => {
        const s = sports[type];
        const hours = A.fmt(s.moving / 3600, 1) + " h";
        return type + " " + (s.km > 0 ? A.fmt(s.km, 1) + " km · " : "") + hours;
      })
      .join("; ");
  }

  function renderWeekly() {
    const weeks = weeklyRows();
    const anyTss = weeks.some((w) => w.tssN > 0);
    const table = el("table", "data-table");
    const head = el("thead");
    const headRow = el("tr");
    ["Week starting", "Hours", "Km", "Sessions"].concat(anyTss ? ["TSS"] : []).concat(["By sport"]).forEach((label, i) => {
      headRow.append(el("th", i > 0 && label !== "By sport" ? "num" : null, label));
    });
    head.append(headRow);
    const body = el("tbody");
    weeks.slice(0, weeksShown).forEach((w) => {
      const tr = el("tr");
      tr.append(el("td", null, A.formatDate(w.week)));
      tr.append(el("td", "num", A.fmt(w.moving / 3600, 1)));
      tr.append(el("td", "num", A.fmt(w.km, 1)));
      tr.append(el("td", "num", String(w.count)));
      if (anyTss) tr.append(el("td", "num", w.tssN ? A.fmt(w.tss, 0) : "—"));
      tr.append(el("td", null, w.count ? sportSplit(w.sports) : "—"));
      body.append(tr);
    });
    table.append(head, body);
    els.weeklyTable.replaceChildren(table);
    const sportName = state.sport === "all" ? "all sports" : state.sport;
    els.weeklyCaption.textContent = "Monday to Sunday weeks, latest first, " + A.formatDate(state.from) + " to " + A.formatDate(state.to) +
      ", " + sportName + ". Follows the sport and dates chosen in the report below." + (anyTss ? " TSS is summed where a workout has one." : "");
    els.weeklyMore.hidden = weeks.length <= weeksShown;
    els.weeklyMore.textContent = "Show more weeks (" + (weeks.length - Math.min(weeksShown, weeks.length)) + " more)";
  }

  function render() {
    if (state.from > state.to) {
      const swap = state.from;
      state.from = state.to;
      state.to = swap;
    }
    els.metric.value = state.metric;
    els.group.value = state.group;
    els.sport.value = state.sport;
    els.chartType.value = state.chart;
    els.from.value = state.from;
    els.to.value = state.to;
    rows = aggregate();
    const sportName = state.sport === "all" ? "All sports" : state.sport;
    els.title.textContent = METRICS[state.metric] + " by " + state.group + " · " + sportName;
    const long = rows.length > 80 ? " This is a long range. Month or year is easier to read on a phone." : "";
    els.caption.textContent = A.formatDate(state.from) + " to " + A.formatDate(state.to) + ". " + summary(rows) + long;
    renderTable(rows);
    renderWeekly();
    writeUrl();
    const color = state.sport === "all" ? "#16352C" : A.SPORT_COLOR[state.sport] || "#16352C";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || rows.length > 60;
    if (!window.Chart) {
      els.fallback.hidden = false;
      els.fallback.textContent = "The chart library did not load. The numbers under the chart are the report.";
      return;
    }
    els.fallback.hidden = true;
    const frame = document.getElementById("report-chart").parentElement;
    const scroller = frame.parentElement;
    const needed = rows.length * (state.chart === "bar" ? 18 : 12);
    const available = scroller.clientWidth || 320;
    frame.style.width = needed > available ? needed + "px" : "100%";
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("report-chart"), {
      type: state.chart,
      data: {
        labels: rows.map((row) => A.periodLabel(row.period, state.group)),
        datasets: [
          {
            label: METRICS[state.metric],
            data: rows.map((row) => row.value),
            backgroundColor: state.chart === "bar" ? color : "transparent",
            borderColor: color,
            borderWidth: 2,
            pointRadius: state.chart === "line" ? 3 : 0,
            spanGaps: false,
            tension: 0.15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduce ? false : { duration: 400, easing: "easeOutQuart" },
        scales: {
          x: {
            ticks: { color: "#14241C", font: { family: "Barlow", size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { display: false },
          },
          y: {
            beginAtZero: state.metric !== "hr",
            ticks: { color: "#14241C", font: { family: "Barlow" } },
            grid: { color: "rgba(20, 36, 28, 0.12)" },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => (items[0] ? rows[items[0].dataIndex].period : ""),
              label: (item) => METRICS[state.metric] + ": " + (item.parsed.y == null ? "—" : item.formattedValue),
            },
          },
        },
      },
    });
  }

  function download() {
    const header = "period," + state.metric;
    const lines = [header].concat(rows.map((row) => row.period + "," + (row.value == null ? "" : row.value)));
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sport = state.sport === "all" ? "all" : state.sport.toLowerCase().replace(/\s+/g, "-");
    link.href = url;
    link.download = sport + "-" + state.metric + "-by-" + state.group + ".csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function fillSports(types) {
    els.sport.replaceChildren();
    const all = el("option", null, "All sports");
    all.value = "all";
    els.sport.append(all);
    types.forEach((type) => {
      const option = el("option", null, type);
      option.value = type;
      els.sport.append(option);
    });
    if (state.sport !== "all" && types.indexOf(state.sport) === -1) state.sport = "all";
  }

  function bind() {
    document.getElementById("report-form").addEventListener("submit", (event) => event.preventDefault());
    ["metric", "group", "sport", "chartType", "from", "to"].forEach((key) => {
      els[key].addEventListener("change", () => {
        state.metric = els.metric.value;
        state.group = els.group.value;
        state.sport = els.sport.value;
        state.chart = els.chartType.value;
        state.from = els.from.value;
        state.to = els.to.value;
        weeksShown = WEEK_PAGE;
        render();
      });
    });
    els.download.addEventListener("click", download);
    els.weeklyMore.addEventListener("click", () => {
      weeksShown += WEEK_PAGE * 2;
      renderWeekly();
    });
  }

  fetch("data/activities.json" + BUST)
    .then((response) => {
      if (!response.ok) throw new Error("Could not read data/activities.json (" + response.status + ").");
      return response.json();
    })
    .then((file) => {
      return fetch("data/aggregates.json" + BUST).then((response) => {
        if (!response.ok) throw new Error("Could not read data/aggregates.json (" + response.status + ").");
        return response.json().then((aggregates) => ({ file: file, aggregates: aggregates }));
      });
    })
    .then((loaded) => {
      const unpacked = A.unpackActivities(loaded.file);
      activities = unpacked.activities;
      const types = [];
      const typeSet = new Set(activities.map((activity) => activity.type).filter(Boolean));
      A.SPORT_ORDER.forEach((type) => {
        if (typeSet.has(type)) {
          types.push(type);
          typeSet.delete(type);
        }
      });
      Array.from(typeSet).sort().forEach((type) => types.push(type));
      readUrl(loaded.aggregates.meta.first_date, loaded.aggregates.meta.last_date);
      fillSports(types);
      els.status.hidden = true;
      els.section.hidden = false;
      els.weekly.hidden = false;
      bind();
      render();
    })
    .catch((error) => {
      els.status.textContent = error.message + " Serve this folder with a local web server, then open the site from that address.";
    });
})();
