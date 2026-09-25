// Small, dependency-free helpers shared across modules.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Drive a requestAnimationFrame loop from 0 → 1 over `duration` ms.
 * Returns a cancel function. Honors prefers-reduced-motion.
 */
export function animate(duration, onFrame, ease = easeOutCubic) {
  if (prefersReducedMotion()) {
    onFrame(1);
    return () => {};
  }
  let raf;
  let start;
  const tick = (now) => {
    start ??= now;
    const t = Math.min(1, (now - start) / duration);
    onFrame(ease(t));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/* ---------- Dates (always local time, stored as YYYY-MM-DD) ---------- */

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d ?? 1);
}

export const currentMonthKey = () => toISODate(new Date()).slice(0, 7);

export function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  return toISODate(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}

export function daysInMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** The `n` month keys ending at (and including) `endKey`, oldest first. */
export const lastMonths = (endKey, n) =>
  Array.from({ length: n }, (_, i) => shiftMonth(endKey, i - n + 1));

/* ---------- Colors ---------- */

export function withAlpha(color, alpha) {
  const hex = color.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ---------- Number / date formatting ---------- */

export function makeFormatters({ locale = "en-IN", currency = "INR" } = {}) {
  const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
  const cents = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Short axis labels: lakh/crore for Indian locales, K/M/B elsewhere.
  const symbol = whole.formatToParts(0).find((p) => p.type === "currency")?.value ?? "";
  const units = locale.endsWith("-IN")
    ? [[1e7, "Cr"], [1e5, "L"], [1e3, "K"]]
    : [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const short = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const compact = {
    format(v) {
      const [div, unit] = units.find(([d]) => Math.abs(v) >= d) ?? [1, ""];
      return `${v < 0 ? "−" : ""}${symbol}${short.format(Math.abs(v) / div)}${unit}`;
    },
  };
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const monthLong = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayLong = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" });
  const dayShort = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return {
    symbol,
    money: (v) => (Number.isInteger(Math.round(v * 100) / 100) ? whole : cents).format(v),
    moneyWhole: (v) => whole.format(Math.round(v)),
    compact: (v) => compact.format(v),
    percent: (v) => percent.format(v),
    monthLong: (key) => monthLong.format(parseISODate(`${key}-01`)),
    monthShort: (key) => monthShort.format(parseISODate(`${key}-01`)),
    dayLong: (iso) => dayLong.format(parseISODate(iso)),
    dayShort: (iso) => dayShort.format(parseISODate(iso)),
    time: (date) => time.format(date),
  };
}
