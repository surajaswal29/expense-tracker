// Minimal RFC 4180 CSV import/export for transactions.
import { resolveCategory } from "./categories.js";

const COLUMNS = ["date", "type", "category", "amount", "note"];
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value, isText) {
  let s = String(value ?? "");
  // Prevent spreadsheet formula injection for free-text fields.
  if (isText && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(transactions) {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => COLUMNS.map((k) => escapeCell(t[k], k === "note" || k === "category")).join(","));
  return [COLUMNS.join(","), ...rows].join("\r\n");
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parse CSV text into validated transaction drafts. Returns { valid, skipped }. */
export function transactionsFromCSV(text) {
  const [header = [], ...rows] = parseCSV(text.replace(/^﻿/, ""));
  const index = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  if (!("date" in index) || !("amount" in index)) {
    throw new Error('CSV needs at least "date" and "amount" columns');
  }

  const valid = [];
  let skipped = 0;
  for (const r of rows) {
    const get = (k) => (k in index ? (r[index[k]] ?? "").trim() : "");
    const date = get("date");
    const rawAmount = Number.parseFloat(get("amount").replace(/[^0-9.\-]/g, ""));
    let type = get("type").toLowerCase();
    if (type !== "income" && type !== "expense") type = "expense";
    const amount = Math.abs(rawAmount);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(amount > 0)) {
      skipped++;
      continue;
    }
    valid.push({
      date,
      type,
      amount: Math.round(amount * 100) / 100,
      category: resolveCategory(get("category"), type),
      note: get("note").replace(/^'(?=[=+\-@])/, "").slice(0, 80),
    });
  }
  return { valid, skipped };
}
