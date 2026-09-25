import { Store } from "./store.js";
import { CATEGORIES, getCategory } from "./categories.js";
import { DonutChart, BarChart, PaceChart, Sparkline } from "./charts.js";
import { toCSV, transactionsFromCSV } from "./csv.js";
import {
  $,
  $$,
  animate,
  currentMonthKey,
  daysInMonth,
  debounce,
  escapeHTML,
  lastMonths,
  makeFormatters,
  prefersReducedMotion,
  shiftMonth,
  toISODate,
} from "./utils.js";

const store = new Store();
let fmt = makeFormatters(store.state.settings);

const view = { month: currentMonthKey(), query: "", type: "all", category: "all" };

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

/* ============================== Charts ============================== */

const chartOpts = () => ({ format: (v) => fmt.money(v), compact: (v) => fmt.compact(v) });
const tipOf = (id) => $(`#${id}`).parentElement.querySelector(".chart-tip");

const donut = new DonutChart($("#donut-chart"), chartOpts());
const bars = new BarChart($("#bars-chart"), { ...chartOpts(), tooltip: tipOf("bars-chart") });
const pace = new PaceChart($("#pace-chart"), { ...chartOpts(), tooltip: tipOf("pace-chart") });
const sparks = Object.fromEntries(
  $$(".kpi").map((el) => [el.dataset.kpi, new Sparkline($(".kpi-spark", el))])
);
const allCharts = [donut, bars, pace, ...Object.values(sparks)];

bars.onSelect = (i) => setMonth(bars.data.months[i].key);

/* ============================== Rendering ============================== */

function render({ animated = true } = {}) {
  renderHeader();
  renderKPIs(animated);
  renderDonut(animated);
  renderBars(animated);
  renderPace(animated);
  renderBudgets();
  renderTransactions();
}

function renderHeader() {
  $("#month-label").textContent = fmt.monthLong(view.month);
  $('[data-month="1"]').disabled = view.month >= currentMonthKey();
  document.title = `${fmt.monthLong(view.month)} · Expenzie`;
}

function deltaText(cur, prev, { goodWhenUp = true, isRate = false } = {}) {
  const prevLabel = fmt.monthShort(shiftMonth(view.month, -1));
  if (isRate) {
    const diff = Math.round((cur - prev) * 100);
    if (!diff) return { text: `Same as ${prevLabel}`, cls: "" };
    return { text: `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} pts vs ${prevLabel}`, cls: diff > 0 === goodWhenUp ? "good" : "bad" };
  }
  if (!prev) return { text: cur ? `Nothing in ${prevLabel}` : "No activity yet", cls: "" };
  const change = (cur - prev) / Math.abs(prev);
  if (Math.abs(change) < 0.005) return { text: `Same as ${prevLabel}`, cls: "" };
  return {
    text: `${change > 0 ? "▲" : "▼"} ${fmt.percent(Math.abs(change))} vs ${prevLabel}`,
    cls: change > 0 === goodWhenUp ? "good" : "bad",
  };
}

function countUp(el, to, format, animated) {
  const from = Number(el.dataset.current ?? 0);
  el.dataset.current = to;
  el._cancel?.();
  if (!animated || from === to) {
    el.textContent = format(to);
    return;
  }
  el._cancel = animate(700, (p) => {
    el.textContent = p < 1 ? format(from + (to - from) * p, true) : format(to);
  });
}

function renderKPIs(animated) {
  const cur = store.summary(view.month);
  const prev = store.summary(shiftMonth(view.month, -1));
  const history = lastMonths(view.month, 6).map((k) => store.summary(k));
  const money = (v, rough) => (rough ? fmt.moneyWhole(v) : fmt.money(v));
  const rate = (v) => fmt.percent(v);

  const config = {
    net: { value: cur.net, format: money, delta: deltaText(cur.net, prev.net), color: "accent", key: "net" },
    income: { value: cur.income, format: money, delta: deltaText(cur.income, prev.income), color: "income", key: "income" },
    expense: {
      value: cur.expense,
      format: money,
      delta: deltaText(cur.expense, prev.expense, { goodWhenUp: false }),
      color: "expense",
      key: "expense",
    },
    savings: {
      value: cur.savingsRate,
      format: rate,
      delta: deltaText(cur.savingsRate, prev.savingsRate, { isRate: true }),
      color: "accent",
      key: "savingsRate",
    },
  };

  for (const [name, c] of Object.entries(config)) {
    const card = $(`.kpi[data-kpi="${name}"]`);
    const valueEl = $("[data-value]", card);
    countUp(valueEl, c.value, c.format, animated);
    valueEl.classList.toggle("negative", c.value < 0);
    const deltaEl = $("[data-delta]", card);
    deltaEl.textContent = c.delta.text;
    deltaEl.className = `kpi-delta ${c.delta.cls}`;
    sparks[name].setData({ values: history.map((s) => s[c.key]), color: c.color }, { animated });
  }
}

function renderDonut(animated) {
  const totals = store.expenseByCategory(view.month);
  const items = [...totals]
    .map(([id, value]) => ({ id, value, ...pick(getCategory(id), "label", "color", "icon") }))
    .sort((a, b) => b.value - a.value);
  const total = items.reduce((s, d) => s + d.value, 0);

  donut.setData({ items }, { animated });
  $("#donut-chart").setAttribute(
    "aria-label",
    total
      ? `Spending by category: ${items.map((d) => `${d.label} ${fmt.money(d.value)}`).join(", ")}`
      : "No spending this month"
  );

  $("#donut-legend").innerHTML = items.length
    ? items
        .map(
          (d, i) => `
      <li data-index="${i}" tabindex="0">
        <i class="swatch" style="--c:${d.color}"></i>
        <span class="legend-label">${d.icon} ${escapeHTML(d.label)}</span>
        <span class="legend-value">${fmt.money(d.value)}</span>
        <span class="legend-pct">${Math.round((d.value / total) * 100)}%</span>
      </li>`
        )
        .join("")
    : `<li class="legend-empty">No expenses recorded for ${fmt.monthLong(view.month)}.</li>`;
}

function renderBars(animated) {
  const now = currentMonthKey();
  const windowEnd = lastMonths(now, 6).includes(view.month) ? now : view.month;
  const months = lastMonths(windowEnd, 6).map((key) => ({
    key,
    label: fmt.monthShort(key),
    title: fmt.monthLong(key),
    ...store.summary(key),
  }));
  bars.setData({ months, selected: view.month }, { animated });
  $("#bars-chart").setAttribute(
    "aria-label",
    `Cash flow: ${months.map((m) => `${m.title} income ${fmt.money(m.income)}, expenses ${fmt.money(m.expense)}`).join("; ")}`
  );
}

function monthProgress() {
  const days = daysInMonth(view.month);
  const now = currentMonthKey();
  const elapsed = view.month < now ? days : view.month === now ? new Date().getDate() : 0;
  return { days, elapsed };
}

function totalBudget() {
  return Object.values(store.state.budgets).reduce((s, v) => s + v, 0);
}

function renderPace(animated) {
  const { days, elapsed } = monthProgress();
  const daily = Array(elapsed).fill(0);
  for (const t of store.forMonth(view.month)) {
    const d = Number(t.date.slice(8, 10)) - 1;
    if (t.type === "expense" && d < elapsed) daily[d] += t.amount;
  }
  const budget = totalBudget();
  pace.setData(
    { daily, days, budget, dateFor: (i) => fmt.dayShort(`${view.month}-${String(i + 1).padStart(2, "0")}`) },
    { animated }
  );

  const spent = daily.reduce((s, v) => s + v, 0);
  let sub = "Month-to-date spend";
  if (budget > 0 && elapsed) {
    const expected = (budget / days) * elapsed;
    const diff = spent - expected;
    sub =
      Math.abs(diff) < budget * 0.01
        ? "Right on budget pace"
        : diff > 0
          ? `${fmt.moneyWhole(diff)} ahead of budget pace`
          : `${fmt.moneyWhole(-diff)} under budget pace — nice!`;
  }
  $("#pace-sub").textContent = sub;
  $("#pace-chart").setAttribute("aria-label", `${sub}. Spent ${fmt.money(spent)} of ${fmt.money(budget)} budget.`);
}

function renderBudgets() {
  const spentBy = store.expenseByCategory(view.month);
  const { budgets } = store.state;
  const rows = CATEGORIES.expense
    .filter((c) => budgets[c.id] > 0)
    .map((c) => ({ ...c, limit: budgets[c.id], spent: spentBy.get(c.id) ?? 0 }))
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit);

  const total = totalBudget();
  const spentTotal = rows.reduce((s, r) => s + r.spent, 0);
  $("#budget-summary").textContent = total
    ? `${fmt.money(spentTotal)} of ${fmt.money(total)} used`
    : "No limits set";

  $("#budget-list").innerHTML = rows.length
    ? rows
        .map((r) => {
          const ratio = r.spent / r.limit;
          const status = ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "ok";
          const left = r.limit - r.spent;
          return `
        <li class="budget ${status}">
          <div class="budget-top">
            <span class="budget-name">${r.icon} ${escapeHTML(r.label)}</span>
            <span class="budget-left">${left >= 0 ? `${fmt.money(left)} left` : `${fmt.money(-left)} over`}</span>
          </div>
          <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${r.limit}" aria-valuenow="${Math.min(r.spent, r.limit)}"
               aria-label="${escapeHTML(r.label)} budget used">
            <span style="--pct:${Math.min(ratio, 1) * 100}%; --c:${r.color}"></span>
          </div>
          <p class="budget-meta">${fmt.money(r.spent)} <span>/ ${fmt.money(r.limit)}</span></p>
        </li>`;
        })
        .join("")
    : `<li class="empty-inline">Set monthly limits to track them here.</li>`;
}

function filteredTransactions() {
  const q = view.query.trim().toLowerCase();
  return store
    .forMonth(view.month)
    .filter((t) => view.type === "all" || t.type === view.type)
    .filter((t) => view.category === "all" || t.category === view.category)
    .filter((t) => {
      if (!q) return true;
      const cat = getCategory(t.category).label;
      return [t.note, cat, String(t.amount), fmt.money(t.amount)].some((s) => s?.toLowerCase().includes(q));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

function renderTransactions() {
  const list = filteredTransactions();
  const monthTotal = store.forMonth(view.month).length;
  $("#tx-count").textContent =
    list.length === monthTotal ? `${monthTotal} this month` : `Showing ${list.length} of ${monthTotal}`;

  if (!list.length) {
    const filtered = monthTotal > 0;
    $("#tx-list").innerHTML = `
      <div class="empty">
        <div class="empty-art" aria-hidden="true">${filtered ? "🔎" : "🧾"}</div>
        <p class="empty-title">${filtered ? "No matches" : "No transactions yet"}</p>
        <p class="muted">${filtered ? "Try a different search or filter." : `Add your first transaction for ${fmt.monthLong(view.month)}.`}</p>
        ${filtered ? '<button class="btn btn-ghost btn-sm" data-action="clear-filters">Clear filters</button>' : '<button class="btn btn-primary btn-sm" data-action="add">Add transaction</button>'}
      </div>`;
    return;
  }

  const groups = Map.groupBy
    ? Map.groupBy(list, (t) => t.date)
    : list.reduce((m, t) => m.set(t.date, [...(m.get(t.date) ?? []), t]), new Map());

  $("#tx-list").innerHTML = [...groups]
    .map(([date, items]) => {
      const dayNet = items.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
      return `
      <section class="tx-group">
        <h3 class="tx-date"><span>${fmt.dayLong(date)}</span><span class="${dayNet >= 0 ? "pos" : "neg"}">${dayNet >= 0 ? "+" : "−"}${fmt.money(Math.abs(dayNet))}</span></h3>
        <ul>${items.map(txItem).join("")}</ul>
      </section>`;
    })
    .join("");
}

function txItem(t) {
  const c = getCategory(t.category);
  const title = escapeHTML(t.note || c.label);
  const sign = t.type === "income" ? "+" : "−";
  return `
    <li class="tx" data-id="${escapeHTML(t.id)}">
      <span class="tx-icon" style="--c:${c.color}" aria-hidden="true">${c.icon}</span>
      <div class="tx-main">
        <p class="tx-title">${title}</p>
        <p class="tx-meta">${escapeHTML(c.label)}</p>
      </div>
      <p class="tx-amount ${t.type}">${sign}${fmt.money(t.amount)}</p>
      <div class="tx-actions">
        <button class="icon-btn sm" data-action="edit" aria-label="Edit ${title}">${ICONS.edit}</button>
        <button class="icon-btn sm" data-action="delete" aria-label="Delete ${title}">${ICONS.trash}</button>
      </div>
    </li>`;
}

function pick(obj, ...keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

/* ============================== Navigation ============================== */

function setMonth(key) {
  if (key === view.month || key > currentMonthKey()) return;
  const go = () => {
    view.month = key;
    render();
  };
  if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(go);
  else go();
}

$$("[data-month]").forEach((btn) =>
  btn.addEventListener("click", () => setMonth(shiftMonth(view.month, Number(btn.dataset.month))))
);

/* ============================== Filters ============================== */

function populateCategoryFilter() {
  const group = (type, label) =>
    `<optgroup label="${label}">${CATEGORIES[type].map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join("")}</optgroup>`;
  $("#category-filter").innerHTML =
    `<option value="all">All categories</option>${group("expense", "Expenses")}${group("income", "Income")}`;
}

$("#search").addEventListener(
  "input",
  debounce((e) => {
    view.query = e.target.value;
    renderTransactions();
  }, 120)
);
$("#type-filter").addEventListener("change", (e) => {
  view.type = e.target.value;
  renderTransactions();
});
$("#category-filter").addEventListener("change", (e) => {
  view.category = e.target.value;
  renderTransactions();
});

function clearFilters() {
  Object.assign(view, { query: "", type: "all", category: "all" });
  $("#search").value = "";
  $('#type-filter input[value="all"]').checked = true;
  $("#category-filter").value = "all";
  renderTransactions();
}

/* ============================== Donut legend sync ============================== */

const legend = $("#donut-legend");
const legendIndex = (e) => e.target.closest("[data-index]")?.dataset.index;
for (const type of ["pointerover", "focusin"]) {
  legend.addEventListener(type, (e) => {
    const i = legendIndex(e);
    if (i != null) donut.highlight(Number(i));
  });
}
legend.addEventListener("pointerleave", () => donut.highlight(null));
legend.addEventListener("focusout", () => donut.highlight(null));
$("#donut-chart").addEventListener("pointermove", () => {
  $$("li", legend).forEach((li) => li.classList.toggle("active", Number(li.dataset.index) === donut.hover));
});
$("#donut-chart").addEventListener("pointerleave", () => $$("li", legend).forEach((li) => li.classList.remove("active")));

/* ============================== Transaction dialog ============================== */

const txDialog = $("#tx-dialog");
const txForm = $("#tx-form");
let editingId = null;

function fillCategories(type, selected) {
  const select = txForm.elements.category;
  select.innerHTML = CATEGORIES[type].map((c) => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join("");
  if (CATEGORIES[type].some((c) => c.id === selected)) select.value = selected;
}

function openTxDialog(tx = null) {
  editingId = tx?.id ?? null;
  txForm.reset();
  txForm.classList.remove("submitted");
  const type = tx?.type ?? "expense";
  txForm.elements.type.value = type;
  txDialog.dataset.type = type;
  fillCategories(type, tx?.category);
  txForm.elements.amount.value = tx?.amount ?? "";
  const today = toISODate(new Date());
  txForm.elements.date.value = tx?.date ?? (view.month === currentMonthKey() ? today : `${view.month}-01`);
  txForm.elements.date.max = today;
  txForm.elements.note.value = tx?.note ?? "";
  $("#tx-dialog-title").textContent = tx ? "Edit transaction" : "Add transaction";
  $("#tx-submit").textContent = tx ? "Save changes" : "Add";
  txDialog.showModal();
  txForm.elements.amount.focus();
}

txForm.addEventListener("change", (e) => {
  if (e.target.name === "type") {
    txDialog.dataset.type = e.target.value;
    fillCategories(e.target.value, txForm.elements.category.value);
  }
});

txForm.addEventListener("submit", (e) => {
  e.preventDefault();
  txForm.classList.add("submitted");
  if (!txForm.checkValidity()) {
    txForm.querySelector(":invalid")?.focus();
    return;
  }
  const f = txForm.elements;
  const data = {
    type: f.type.value,
    amount: Math.round(Number(f.amount.value) * 100) / 100,
    category: f.category.value,
    date: f.date.value,
    note: f.note.value.trim(),
  };
  const targetMonth = data.date.slice(0, 7);

  if (editingId) {
    store.updateTransaction(editingId, data);
    toast("Transaction updated");
  } else {
    store.addTransaction(data);
    if (targetMonth !== view.month) {
      toast(`Added to ${fmt.monthLong(targetMonth)}`, { label: "View", run: () => setMonth(targetMonth) });
    } else {
      toast(`${data.type === "income" ? "Income" : "Expense"} of ${fmt.money(data.amount)} added`);
    }
  }
  txDialog.close();
});

/* ============================== Budget dialog ============================== */

const budgetDialog = $("#budget-dialog");

function openBudgetDialog() {
  const { budgets } = store.state;
  $("#budget-fields").innerHTML = CATEGORIES.expense
    .map(
      (c) => `
    <label class="budget-field">
      <span>${c.icon} ${c.label}</span>
      <input type="number" name="${c.id}" min="0" step="100" inputmode="numeric" placeholder="No limit" value="${budgets[c.id] ?? ""}" />
    </label>`
    )
    .join("");
  budgetDialog.showModal();
}

$("#edit-budgets").addEventListener("click", openBudgetDialog);
$("#budget-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const entries = $$("input", e.target).map((i) => [i.name, Number(i.value)]);
  store.setBudgets(Object.fromEntries(entries));
  budgetDialog.close();
  toast("Budgets saved");
});

// Shared dialog behaviour: close buttons + click on backdrop.
for (const dialog of [txDialog, budgetDialog]) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
}

/* ============================== List actions ============================== */

$("#tx-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "add") return openTxDialog();
  if (action === "clear-filters") return clearFilters();

  const id = btn.closest("[data-id]")?.dataset.id;
  const tx = store.state.transactions.find((t) => t.id === id);
  if (!tx) return;
  if (action === "edit") openTxDialog(tx);
  if (action === "delete") {
    const removed = store.removeTransaction(id);
    toast(`Deleted “${removed.note || getCategory(removed.category).label}”`, {
      label: "Undo",
      run: () => store.restoreTransaction(removed),
    });
  }
});

$("#add-btn").addEventListener("click", () => openTxDialog());

/* ============================== Menu: import / export ============================== */

const menu = $("#app-menu");
const importInput = $("#import-input");

menu.addEventListener("click", (e) => {
  const action = e.target.closest("[data-menu]")?.dataset.menu;
  if (!action) return;
  menu.hidePopover();

  if (action === "export") {
    const blob = new Blob([toCSV(store.state.transactions)], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `expenzie-${toISODate(new Date())}.csv`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${store.state.transactions.length} transactions`);
  }
  if (action === "import") importInput.click();
  if (action === "reset" && confirm("Replace all transactions and budgets with demo data?")) {
    view.month = currentMonthKey();
    store.resetDemo();
    toast("Demo data loaded");
  }
  if (action === "clear" && confirm("Delete all transactions and budgets? This can't be undone.")) {
    store.clearAll();
    toast("All data cleared");
  }
});

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  importInput.value = "";
  if (!file) return;
  try {
    const { valid, skipped } = transactionsFromCSV(await file.text());
    if (!valid.length) throw new Error("No valid rows found");
    store.importTransactions(valid);
    toast(`Imported ${valid.length} transactions${skipped ? ` · skipped ${skipped}` : ""}`);
  } catch (err) {
    toast(`Import failed: ${err.message}`, null, "error");
  }
});

/* ============================== Toasts ============================== */

function toast(message, action = null, variant = "") {
  const el = document.createElement("div");
  el.className = `toast ${variant}`;
  el.innerHTML = `<span>${escapeHTML(message)}</span>`;
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add("leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    if (prefersReducedMotion()) el.remove();
  };
  if (action) {
    const btn = Object.assign(document.createElement("button"), { type: "button", textContent: action.label });
    btn.addEventListener("click", () => {
      action.run();
      dismiss();
    });
    el.append(btn);
  }
  $("#toasts").append(el);
  timer = setTimeout(dismiss, action ? 6000 : 3500);
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("pointerleave", () => (timer = setTimeout(dismiss, 2500)));
}

/* ============================== Theme ============================== */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme() {
  const { theme } = store.state.settings;
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const dark = theme === "dark" || (theme === "system" && darkQuery.matches);
  $("#theme-toggle").setAttribute("aria-pressed", String(dark));
  requestAnimationFrame(() => allCharts.forEach((c) => c.draw()));
}

$("#theme-toggle").addEventListener("click", () => {
  const isDark = $("#theme-toggle").getAttribute("aria-pressed") === "true";
  const flip = () => {
    store.setSetting("theme", isDark ? "light" : "dark");
    applyTheme();
  };
  if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(flip);
  else flip();
});
darkQuery.addEventListener("change", applyTheme);

/* ============================== Clock ============================== */

function tick() {
  const now = new Date();
  const clock = $("#clock");
  clock.textContent = fmt.time(now);
  clock.dateTime = now.toISOString();
  setTimeout(tick, 1000 - now.getMilliseconds());
}

/* ============================== Keyboard ============================== */

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  if (e.target.closest("input, textarea, select, [contenteditable]") || $("dialog[open]")) return;
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    openTxDialog();
  } else if (e.key === "/") {
    e.preventDefault();
    $("#search").focus();
  } else if (e.key === "ArrowLeft") {
    setMonth(shiftMonth(view.month, -1));
  } else if (e.key === "ArrowRight") {
    setMonth(shiftMonth(view.month, 1));
  }
});

/* ============================== Boot ============================== */

store.addEventListener("change", (e) => {
  if (e.detail.reason === "settings") return;
  fmt = makeFormatters(store.state.settings);
  render();
});

populateCategoryFilter();
$("#currency-symbol").textContent = fmt.symbol;
applyTheme();
render();
tick();
document.fonts?.ready.then(() => allCharts.forEach((c) => c.draw()));
