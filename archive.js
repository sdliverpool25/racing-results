(function (root) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STRAVA_SOURCE = "Strava (added 19 Oct 2026)";
  const SPORT_ORDER = ["Run", "Ride", "Swim", "Virtual Ride", "Weight Training", "Hike", "Walk", "Workout", "Yoga", "Rowing", "Stand Up Paddling"];
  const STACK_SPORTS = ["Run", "Ride", "Swim", "Virtual Ride", "Weight Training"];
  const SPORT_COLOR = {
    Run: "#16352C",
    Ride: "#1E4D8C",
    Swim: "#0E6E78",
    "Virtual Ride": "#5C4A78",
    "Weight Training": "#8A4E12",
    Hike: "#3F6B45",
    Walk: "#5C6B45",
    Workout: "#8A6232",
    Yoga: "#3F6B6B",
    Rowing: "#1E4D8C",
    "Stand Up Paddling": "#0E6E78",
    Other: "#5C564C",
  };

  function isoMonday(iso) {
    const parts = iso.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date.toISOString().slice(0, 10);
  }

  function addDays(iso, days) {
    const parts = iso.split("-").map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function shiftMonth(yearMonth, delta) {
    let year = Number(yearMonth.slice(0, 4));
    let month = Number(yearMonth.slice(5, 7)) + delta;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    return year + "-" + String(month).padStart(2, "0");
  }

  function eachPeriod(start, end, group) {
    const out = [];
    if (group === "year") {
      for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year += 1) out.push(String(year));
      return out;
    }
    if (group === "month") {
      let cursor = start.slice(0, 7);
      const last = end.slice(0, 7);
      while (cursor <= last) {
        out.push(cursor);
        cursor = shiftMonth(cursor, 1);
      }
      return out;
    }
    let cursor = isoMonday(start);
    const lastWeek = isoMonday(end);
    while (cursor <= lastWeek) {
      out.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return out;
  }

  function unpackTable(table) {
    return table.rows.map((row) => {
      const item = {};
      table.fields.forEach((name, index) => {
        item[name] = row[index];
      });
      return item;
    });
  }

  function unpackActivities(file) {
    const index = {};
    file.fields.forEach((name, position) => {
      index[name] = position;
    });
    const activities = [];
    let duplicates = 0;
    file.rows.forEach((row) => {
      if (row[index.dup] === 1) {
        duplicates += 1;
        return;
      }
      const item = {};
      file.fields.forEach((name) => {
        item[name] = row[index[name]];
      });
      activities.push(item);
    });
    return {
      activities: activities,
      duplicates: duplicates,
      stravaUrl: file.strava_url || "https://www.strava.com/activities/{id}",
    };
  }

  function activityHref(template, id) {
    return String(template).replace("{id}", id);
  }

  function stackKey(type) {
    return STACK_SPORTS.indexOf(type) === -1 ? "Other" : type;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    const month = MONTHS[Number(parts[1]) - 1] || parts[1];
    return Number(parts[2]) + " " + month + " " + parts[0];
  }

  function periodLabel(period, group) {
    if (group === "year") return period;
    if (group === "month") {
      const month = MONTHS[Number(period.slice(5, 7)) - 1] || period.slice(5, 7);
      return month + " " + period.slice(2, 4);
    }
    const month = MONTHS[Number(period.slice(5, 7)) - 1] || "";
    return Number(period.slice(8, 10)) + " " + month;
  }

  function formatDuration(seconds) {
    if (seconds == null || Number.isNaN(Number(seconds))) return "—";
    const total = Math.round(Number(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours) return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    return minutes + ":" + String(secs).padStart(2, "0");
  }

  function paceLabel(seconds) {
    if (seconds == null || !isFinite(seconds)) return "—";
    const total = Math.round(seconds);
    const minutes = Math.floor(total / 60);
    return minutes + ":" + String(total % 60).padStart(2, "0");
  }

  function fmt(value, digits) {
    if (value == null || !isFinite(Number(value))) return "—";
    return Number(value).toLocaleString("en-AU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function round(value, digits) {
    const scale = Math.pow(10, digits);
    return Math.round(Number(value) * scale) / scale;
  }

  root.Archive = {
    MONTHS: MONTHS,
    STRAVA_SOURCE: STRAVA_SOURCE,
    SPORT_ORDER: SPORT_ORDER,
    STACK_SPORTS: STACK_SPORTS,
    SPORT_COLOR: SPORT_COLOR,
    isoMonday: isoMonday,
    addDays: addDays,
    shiftMonth: shiftMonth,
    eachPeriod: eachPeriod,
    unpackTable: unpackTable,
    unpackActivities: unpackActivities,
    activityHref: activityHref,
    stackKey: stackKey,
    formatDate: formatDate,
    periodLabel: periodLabel,
    formatDuration: formatDuration,
    paceLabel: paceLabel,
    fmt: fmt,
    round: round,
  };
})(typeof window !== "undefined" ? window : globalThis);
