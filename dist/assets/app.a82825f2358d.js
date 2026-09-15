import {
  isoDay,
  localDay,
  monthCells,
  occursOn,
  safeUrl,
  monthFromQuery,
  filterTypes,
  typesFromQuery,
  matchesTypes,
  weekSegments,
  countries,
  countriesFromQuery,
  matchesCountries,
} from "./calendar.a82825f2358d.js";
const $ = (s) => document.querySelector(s);
const types = {
  road: "Шоссе",
  trail: "Трейл",
  other: "Другие",
  triathlon: "Триатлон",
  swimming: "Плавание",
  cycling: "Велосипед",
};
const sportEmoji = {
  road: "🏃",
  trail: "🏔️",
  swimming: "🏊",
  cycling: "🚴",
  triathlon: "🏊 🚴 🏃",
  other: "🏁",
};
const plural = (n, one, few, many) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? few
      : many;
let events = [],
  view = monthFromQuery(location.search),
  selectedTypes = typesFromQuery(location.search),
  selectedCountries = countriesFromQuery(location.search),
  layout = new URLSearchParams(location.search).get("layout") === "wide" ? "wide" : "compact",
  dataset;
const fmt = (day, opts = { day: "numeric", month: "long" }) =>
  localDay(day).toLocaleDateString("ru-RU", opts);
const node = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
function link(text, url, cls) {
  const a = node("a", text, cls);
  a.href = safeUrl(url) || "#";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
function dateRange(e) {
  return (
    fmt(e.date) +
    (e.endDate && e.endDate !== e.date ? " — " + fmt(e.endDate) : "")
  );
}
function sportIcon(type, decorative = false) {
  const icon = node(
    "span",
    sportEmoji[type] || sportEmoji.other,
    "sport-emoji",
  );
  if (decorative) icon.setAttribute("aria-hidden", "true");
  else {
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", types[type] || types.other);
  }
  return icon;
}
function openEvent(e) {
  const box = $("#event-detail");
  const tag = node("span", undefined, "tag");
  tag.append(sportIcon(e.type, true), ` ${types[e.type] || types.other}`);
  box.replaceChildren(tag, node("h2", e.name));
  const dl = node("dl");
  for (const [key, value] of [
    ["Когда", dateRange(e) + " " + e.date.slice(0, 4)],
    ["Где", `${e.city && e.city !== e.location ? e.city + " · " : ""}${e.location} · ${countries[e.country] || e.country}`],
    ...(e.distances?.length
      ? [["Дистанции", e.distances.map((x) => x + " км").join(" / ")]]
      : []),
  ]) {
    dl.append(node("dt", key), node("dd", value));
  }
  box.append(dl);
  if (e.description) box.append(node("p", e.description));
  if (e.status === "cancelled")
    box.append(node("p", "Отменено по данным источника."));
  if (e.needsReview)
    box.append(
      node(
        "p",
        "В источниках есть расхождение или сведения требуют повторной проверки.",
      ),
    );
  box.append(
    link(
      e.linkKind === "calendar"
        ? "Открыть календарь источника ↗"
        : "Открыть событие ↗",
      e.url,
      "primary-link",
    ),
  );
  for (const s of e.sources || []) {
    const p = node("p", undefined, "source-note");
    p.append(
      "Источник: ",
      link(s.name, s.url),
      ` · проверен ${fmt(s.checkedAt.slice(0, 10))}`,
    );
    box.append(p);
  }
  if (!$("#event-dialog").open) $("#event-dialog").showModal();
}
function countryFlag(code) {
  return /^[A-Z]{2}$/.test(code || "")
    ? String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)))
    : "🌍";
}
function eventButton(e, full = false) {
  const b = node("button", undefined, `event ${e.type || "other"}`);
  const title = node("strong");
  const shortName = e.shortName || e.name
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*[-–—]?\s*20\d{2}\b/g, "")
    .trim();
  title.append(sportIcon(e.type), ` ${e.status === "cancelled" ? "Отменено · " : e.needsReview ? "⚠ " : ""}${layout === "compact" && !full ? shortName : e.name}`);
  const locality = e.city || (/^https?:/.test(e.location) ? "Место уточняется" : e.location);
  const place = node("span", undefined, "place");
  const flag = node("span", countryFlag(e.country), "country-flag");
  flag.setAttribute("role", "img");
  flag.setAttribute("aria-label", countries[e.country] || e.country);
  place.append(flag, " ", node("span", locality, "city"));
  b.title = `${e.name} · ${locality} · ${countries[e.country] || e.country}`;
  b.setAttribute("aria-label", `${types[e.type] || types.other}: ${b.title}`);
  b.append(
    title,
    place,
  );
  if (e.endDate && e.endDate !== e.date)
    b.append(node("span", dateRange(e), "range event-dates"));
  if (e.status === "cancelled") b.append(node("span", "Отменено", "range"));
  else if (e.needsReview)
    b.append(node("span", "Уточни дату у организатора", "range"));
  b.addEventListener("click", () => openEvent(e));
  return b;
}
function setMonth(value) {
  view = value;
  saveView();
  render();
}
function saveView() {
  const url = new URL(location.href);
  url.searchParams.set("month", isoDay(view).slice(0, 7));
  if (selectedTypes.size)
    url.searchParams.set("types", [...selectedTypes].join(","));
  else url.searchParams.delete("types");
  if (selectedCountries.size) url.searchParams.set("countries", [...selectedCountries].join(","));
  else url.searchParams.set("countries", "all");
  if (layout === "wide") url.searchParams.set("layout", "wide");
  else url.searchParams.delete("layout");
  history.replaceState(null, "", url);
}
function initFilters() {
  const group = $("#type-filters");
  for (const type of ["all", ...Object.keys(filterTypes)]) {
    const button = node("button", undefined, "type-filter");
    button.type = "button";
    button.dataset.type = type;
    if (type !== "all") button.append(sportIcon(type, true), " ");
    button.append(type === "all" ? "Все" : types[type]);
    button.addEventListener("click", () => {
      if (type === "all") selectedTypes.clear();
      else if (selectedTypes.has(type)) selectedTypes.delete(type);
      else selectedTypes.add(type);
      saveView();
      render();
    });
    group.append(button);
  }
}
function renderFilters() {
  for (const button of $("#type-filters").children) {
    const active =
      button.dataset.type === "all"
        ? !selectedTypes.size
        : selectedTypes.has(button.dataset.type);
    button.setAttribute("aria-pressed", String(active));
  }
  const includesTriathlon =
    selectedTypes.has("swimming") || selectedTypes.has("cycling");
  $("#filter-hint").textContent = includesTriathlon
    ? "Плавание и вело включают триатлоны. Можно выбрать несколько типов."
    : "Можно выбрать несколько типов.";
}
function renderMonths(visibleEvents) {
  const strip = $("#month-shortcuts");
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const options = Array.from(
    { length: 6 },
    (_, i) => new Date(first.getFullYear(), first.getMonth() + i, 1, 12),
  );
  if (!options.some((d) => isoDay(d).slice(0, 7) === isoDay(view).slice(0, 7)))
    options.unshift(new Date(view.getFullYear(), view.getMonth(), 1, 12));
  strip.replaceChildren();
  for (const month of options) {
    const key = isoDay(month).slice(0, 7);
    const end = isoDay(
      new Date(month.getFullYear(), month.getMonth() + 1, 0, 12),
    );
    const count = visibleEvents.filter(
      (e) => e.date <= end && (e.endDate || e.date) >= isoDay(month),
    ).length;
    const button = node("a", undefined, "month-shortcut");
    button.href = `?month=${key}`;
    if (selectedTypes.size)
      button.href += `&types=${encodeURIComponent([...selectedTypes].join(","))}`;
    if (selectedCountries.size) button.href += `&countries=${encodeURIComponent([...selectedCountries].join(","))}`;
    else button.href += "&countries=all";
    if (layout === "wide") button.href += "&layout=wide";
    const monthName = month.toLocaleDateString("ru-RU", { month: "long" });
    button.title = `${monthName} ${month.getFullYear()}: ${count} ${plural(count, "дрыг", "дрыга", "дрыг")}`;
    button.setAttribute("aria-label", button.title);
    button.append(node("span", monthName), node("small", count));
    if (key === isoDay(view).slice(0, 7))
      button.setAttribute("aria-current", "date");
    button.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      setMonth(month);
    });
    strip.append(button);
  }
}
function render() {
  document.body.dataset.layout = layout;
  for (const button of $("#layout-switch").children)
    button.setAttribute("aria-pressed", String(button.dataset.layout === layout));
  $(".calendar-scroll").setAttribute("aria-label", layout === "compact"
    ? "Календарь на месяц" : "Календарь; на узком экране прокручивается горизонтально");
  const visibleEvents = events.filter((event) =>
    matchesTypes(event, selectedTypes) && matchesCountries(event, selectedCountries),
  );
  renderFilters();
  renderCountries();
  renderMonths(visibleEvents);
  const y = view.getFullYear(),
    m = view.getMonth();
  $("#month-title").replaceChildren(
    document.createTextNode(view.toLocaleDateString("ru-RU", { month: "long" }) + " "),
    node("span", view.getFullYear(), "month-year"),
  );
  const grid = $("#calendar");
  grid.replaceChildren();
  const today = isoDay(new Date());
  const cells = monthCells(y, m);
  grid.style.setProperty("--weeks", cells.length / 7);
  for (let offset = 0; offset < cells.length; offset += 7) {
    const dates = cells.slice(offset, offset + 7);
    const week = node("div", undefined, "calendar-week");
    const backgrounds = node("div", undefined, "week-days");
    const segments = weekSegments(visibleEvents, dates);
    week._segments = segments;
    week._dates = dates;
    for (const date of dates) {
      const key = isoDay(date);
      const day = node("section", undefined,
        `day${date.getMonth() !== m ? " outside" : ""}${date.getDay() === 0 || date.getDay() === 6 ? " weekend" : ""}${key === today ? " today" : ""}`);
      day.setAttribute("aria-label", fmt(key, { day: "numeric", month: "long", year: "numeric" }));
      const number = node("button", date.getDate(), "day-number");
      number.setAttribute("aria-label", `${fmt(key)}: все события`);
      number.onclick = () => openDay(key, visibleEvents);
      day.append(number);
      backgrounds.append(day);
    }
    week.append(backgrounds);
    for (const segment of segments) {
      const button = eventButton(segment.event);
      button.classList.add("event-bar");
      if (segment.continuesBefore) button.classList.add("continues-before");
      if (segment.continuesAfter) button.classList.add("continues-after");
      button.style.gridColumn = `${segment.column + 1} / span ${segment.span}`;
      button.style.gridRow = segment.lane + 2;
      button.title += ` · ${dateRange(segment.event)}`;
      segment.button = button;
      week.append(button);
    }
    for (const [column, date] of dates.entries()) {
      const more = node("button", undefined, "more day-more");
      more.style.gridColumn = column + 1;
      more.onclick = () => openDay(isoDay(date), visibleEvents);
      week.append(more);
    }
    grid.append(week);
  }
  fitWeeks();
  const first = isoDay(new Date(y, m, 1, 12)),
    last = isoDay(new Date(y, m + 1, 0, 12));
  const count = visibleEvents.filter(
    (e) => e.date <= last && (e.endDate || e.date) >= first,
  ).length;
  $("#month-count").textContent = count
    ? `${count} ${plural(count, "событие", "события", "событий")} ${selectedTypes.size || selectedCountries.size ? "по выбранным фильтрам" : "в этом месяце"} · Нажми на событие для подробностей`
    : selectedTypes.size || selectedCountries.size
      ? "На этот месяц нет событий по выбранным фильтрам. Попробуй другой месяц, страну или тип."
      : "На этот месяц пока нет дрыг. Загляни в соседний.";
}
function openDay(key, visibleEvents) {
  const box = $("#event-detail");
  const matches = visibleEvents.filter((event) => occursOn(event, key));
  box.replaceChildren(node("h2", fmt(key, { day: "numeric", month: "long", year: "numeric" })));
  if (!matches.length) box.append(node("p", "На этот день событий пока нет."));
  const list = node("div", undefined, "day-event-list");
  matches.forEach((event) => list.append(eventButton(event, true)));
  box.append(list);
  if (!$("#event-dialog").open) $("#event-dialog").showModal();
}
function fitWeeks() {
  for (const week of $("#calendar").children) {
    if (!week._segments) continue;
    const compact = layout === "compact";
    const capacity = compact ? Math.max(0, Math.floor((week.clientHeight - 38) / 32)) : 5;
    week.style.setProperty("--lanes", capacity);
    week.style.gridTemplateRows = `24px ${capacity ? `repeat(${capacity}, ${compact ? "32px" : "72px"}) ` : ""}minmax(14px, 1fr)`;
    for (const segment of week._segments) segment.button.hidden = segment.lane >= capacity;
    [...week.querySelectorAll(".day-more")].forEach((button, column) => {
      const hidden = week._segments.filter((segment) => segment.lane >= capacity &&
        segment.column <= column && column < segment.column + segment.span).length;
      button.hidden = !hidden;
      button.textContent = `+${hidden}`;
      button.setAttribute("aria-label", `${fmt(isoDay(week._dates[column]))}: ещё ${hidden} событий, открыть весь день`);
      button.style.gridRow = capacity + 2;
    });
  }
}
new ResizeObserver(fitWeeks).observe($("#calendar"));
$("#prev").onclick = () => {
  setMonth(new Date(view.getFullYear(), view.getMonth() - 1, 1, 12));
};
$("#next").onclick = () => {
  setMonth(new Date(view.getFullYear(), view.getMonth() + 1, 1, 12));
};
$("#today").onclick = () => {
  setMonth(new Date());
};
$("#event-dialog").addEventListener("click", (e) => {
  if (e.target === $("#event-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
async function load() {
  try {
    const res = await fetch("./data/events.json", { cache: "no-cache" });
    if (!res.ok) throw Error(res.status);
    dataset = await res.json();
    if (!Array.isArray(dataset.events)) throw Error("Invalid data");
    events = dataset.events;
    const count = events.filter(
      (e) =>
        e.status !== "cancelled" && (e.endDate || e.date) >= isoDay(new Date()),
    ).length;
    const countryCount = new Set(events.map((e) => e.country)).size;
    const summary = $("#summary");
    summary.replaceChildren(
      node("strong", count + " " + plural(count, "дрыг", "дрыга", "дрыг")),
      node("br"),
      document.createTextNode(
        ` впереди · ${countryCount} ${plural(countryCount, "страна", "страны", "стран")}`,
      ),
    );
    $("#updated").textContent =
      `Данные обновлены ${fmt(dataset.generatedAt.slice(0, 10), { day: "numeric", month: "long", year: "numeric" })}`;
    render();
  } catch (error) {
    $("#summary").textContent = "Не удалось загрузить события";
    $("#updated").textContent = "Данные недоступны";
    const message = node(
      "p",
      "Не удалось открыть календарь. Проверь соединение.",
      "error",
    );
    const retry = node("button", "Повторить");
    retry.onclick = () => location.reload();
    message.append(retry);
    $("#calendar").replaceChildren(message);
  }
}
for (const button of $("#layout-switch").children) {
  button.addEventListener("click", () => {
    layout = button.dataset.layout;
    saveView();
    render();
  });
}
initFilters();
initCountries();
render();
load();

function initCountries() {
  const list = $("#country-options");
  for (const [code, name] of Object.entries(countries)) {
    const label = node("label", undefined, "country-option");
    const input = node("input");
    input.type = "checkbox";
    input.value = code;
    input.setAttribute("aria-label", name);
    const flag = node("span", countryFlag(code));
    flag.setAttribute("aria-hidden", "true");
    label.append(input, flag, node("span", name), node("small", "", "country-count"));
    input.addEventListener("change", () => {
      if (input.checked) selectedCountries.add(code);
      else selectedCountries.delete(code);
      saveView();
      render();
    });
    list.append(label);
  }
  $("#all-countries").onclick = () => {
    selectedCountries.clear();
    saveView();
    render();
  };
  $("#country-menu").addEventListener("toggle", positionCountryMenu);
  window.addEventListener("resize", positionCountryMenu);
}
function positionCountryMenu() {
  const menu = $("#country-menu");
  if (!menu.matches(":popover-open")) return;
  const rect = $("#country-toggle").getBoundingClientRect();
  menu.style.left = `${Math.max(12, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 12))}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.maxHeight = `${Math.max(100, innerHeight - rect.bottom - 18)}px`;
}
function renderCountries() {
  const toggle = $("#country-toggle");
  toggle.textContent = selectedCountries.size ? `🌍 Страны · ${selectedCountries.size} ▾` : "🌍 Все страны ▾";
  toggle.classList.toggle("active", selectedCountries.size > 0);
  toggle.title = selectedCountries.size ? [...selectedCountries].map((code) => countries[code]).join(", ") : "Выбрать страны";
  const first = isoDay(new Date(view.getFullYear(), view.getMonth(), 1, 12));
  const last = isoDay(new Date(view.getFullYear(), view.getMonth() + 1, 0, 12));
  const counts = {};
  for (const event of events) {
    if (matchesTypes(event, selectedTypes) && event.date <= last && (event.endDate || event.date) >= first)
      counts[event.country] = (counts[event.country] || 0) + 1;
  }
  for (const label of $("#country-options").children) {
    const input = label.querySelector("input");
    input.checked = selectedCountries.has(input.value);
    label.querySelector("small").textContent = counts[input.value] || 0;
  }
  $("#all-countries").setAttribute("aria-pressed", String(!selectedCountries.size));
}
