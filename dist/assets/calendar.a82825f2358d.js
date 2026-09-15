export function isoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function localDay(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function monthCells(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count =
    Math.ceil((offset + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  return Array.from(
    { length: count },
    (_, i) => new Date(year, month, 1 - offset + i, 12),
  );
}
export function occursOn(event, day) {
  return event.date <= day && (event.endDate || event.date) >= day;
}
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}

export function monthFromQuery(search, fallback = new Date()) {
  const value = new URLSearchParams(search).get("month");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return fallback;
  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100
    ? new Date(year, month - 1, 1, 12)
    : fallback;
}

export const filterTypes = {
  road: ["road"],
  trail: ["trail"],
  swimming: ["swimming", "triathlon"],
  cycling: ["cycling", "triathlon"],
  triathlon: ["triathlon"],
  other: ["other"],
};

export function typesFromQuery(search) {
  return new Set(
    (new URLSearchParams(search).get("types") || "")
      .split(",")
      .filter((type) => Object.hasOwn(filterTypes, type)),
  );
}

export function matchesTypes(event, selected) {
  if (!selected.size) return true;
  const type = Object.hasOwn(filterTypes, event.type) ? event.type : "other";
  return [...selected].some((key) => filterTypes[key]?.includes(type));
}

// A race occupies one continuous lane within a Monday–Sunday week.
export function weekSegments(events, days) {
  const keys = days.map(isoDay);
  const segments = events.filter((event) =>
    event.date <= keys.at(-1) && (event.endDate || event.date) >= keys[0],
  ).map((event) => {
    const end = event.endDate || event.date;
    const column = keys.findIndex((key) => key >= event.date);
    const last = keys.findLastIndex((key) => key <= end);
    return { event, column, span: last - column + 1,
      continuesBefore: event.date < keys[0], continuesAfter: end > keys.at(-1) };
  }).sort((a, b) => b.span - a.span || a.column - b.column ||
    a.event.date.localeCompare(b.event.date) || a.event.id.localeCompare(b.event.id));
  const occupied = [];
  for (const segment of segments) {
    let lane = 0;
    const mask = ((1 << segment.span) - 1) << segment.column;
    while ((occupied[lane] || 0) & mask) lane++;
    occupied[lane] = (occupied[lane] || 0) | mask;
    segment.lane = lane;
  }
  return segments;
}

export const countries = {
    RS: "Сербия",
    ME: "Черногория",
    HR: "Хорватия",
    BA: "Босния и Герцеговина",
    SK: "Словакия",
    SI: "Словения",
    MK: "Северная Македония",
    AL: "Албания",
    BG: "Болгария",
    GR: "Греция",
    RO: "Румыния",
    XK: "Косово",
    TR: "Турция",
  };

export function countriesFromQuery(search) {
  const value = new URLSearchParams(search).get("countries");
  if (value === null) return new Set(["RS"]);
  return new Set(value.split(",")
    .map((code) => code.trim().toUpperCase()).filter((code) => Object.hasOwn(countries, code)));
}
export function matchesCountries(event, selected) {
  return !selected.size || selected.has(event.country);
}
