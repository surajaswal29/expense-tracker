// Observable, localStorage-backed state container.
import { uid, toISODate } from "./utils.js";

const STORAGE_KEY = "expenzie:v1";

const DEFAULT_SETTINGS = { currency: "INR", locale: "en-IN", theme: "system" };
const DEFAULT_BUDGETS = {
  food: 12000,
  transport: 4000,
  shopping: 8000,
  bills: 30000,
  entertainment: 5000,
  health: 3000,
};

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStorage(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded: keep working in memory.
  }
}

export class Store extends EventTarget {
  #state;

  constructor() {
    super();
    const saved = readStorage();
    if (saved && Array.isArray(saved.transactions)) {
      this.#state = {
        transactions: saved.transactions,
        budgets: saved.budgets ?? {},
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      };
    } else {
      this.#state = demoState();
      writeStorage(this.#state);
    }
  }

  get state() {
    return this.#state;
  }

  #commit(reason) {
    writeStorage(this.#state);
    this.dispatchEvent(new CustomEvent("change", { detail: { reason } }));
  }

  /* ---------- Mutations ---------- */

  addTransaction(data) {
    const tx = { ...data, id: uid(), createdAt: Date.now() };
    this.#state.transactions.push(tx);
    this.#commit("add");
    return tx;
  }

  updateTransaction(id, patch) {
    const tx = this.#state.transactions.find((t) => t.id === id);
    if (!tx) return null;
    Object.assign(tx, patch);
    this.#commit("update");
    return tx;
  }

  removeTransaction(id) {
    const index = this.#state.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const [removed] = this.#state.transactions.splice(index, 1);
    this.#commit("remove");
    return removed;
  }

  restoreTransaction(tx) {
    this.#state.transactions.push(tx);
    this.#commit("restore");
  }

  importTransactions(list) {
    const now = Date.now();
    for (const t of list) this.#state.transactions.push({ ...t, id: uid(), createdAt: now });
    this.#commit("import");
  }

  setBudgets(budgets) {
    this.#state.budgets = Object.fromEntries(
      Object.entries(budgets).filter(([, v]) => Number.isFinite(v) && v > 0)
    );
    this.#commit("budgets");
  }

  setSetting(key, value) {
    this.#state.settings[key] = value;
    this.#commit("settings");
  }

  resetDemo() {
    this.#state = { ...demoState(), settings: this.#state.settings };
    this.#commit("reset");
  }

  clearAll() {
    this.#state = { transactions: [], budgets: {}, settings: this.#state.settings };
    this.#commit("clear");
  }

  /* ---------- Queries ---------- */

  forMonth(key) {
    return this.#state.transactions.filter((t) => t.date.startsWith(key));
  }

  summary(key) {
    let income = 0;
    let expense = 0;
    for (const t of this.forMonth(key)) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    const net = income - expense;
    return { income, expense, net, savingsRate: income > 0 ? net / income : 0 };
  }

  expenseByCategory(key) {
    const totals = new Map();
    for (const t of this.forMonth(key)) {
      if (t.type === "expense") totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return totals;
  }
}

/* ---------- Demo data ---------- */

// Deterministic PRNG so the demo looks the same on every first load.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoState() {
  const rand = mulberry32(29);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const between = (min, max) => min + rand() * (max - min);
  const today = new Date();
  const transactions = [];

  const add = (date, type, category, amount, note) => {
    if (date > today) return;
    transactions.push({
      id: uid(),
      type,
      category,
      amount: Math.round(amount),
      note,
      date: toISODate(date),
      createdAt: date.getTime(),
    });
  };

  for (let back = 5; back >= 0; back--) {
    const year = today.getFullYear();
    const month = today.getMonth() - back;
    const dim = new Date(year, month + 1, 0).getDate();
    const day = (d) => new Date(year, month, Math.min(d, dim));
    const anyDay = () => day(1 + Math.floor(rand() * dim));
    const times = (min, max, fn) => {
      const n = Math.round(between(min, max));
      for (let i = 0; i < n; i++) fn();
    };

    add(day(1), "income", "salary", 85000, "Monthly salary");
    if (rand() > 0.35)
      add(day(10 + Math.floor(rand() * 12)), "income", "freelance", between(8000, 22000),
        pick(["Website project", "Logo design", "Consulting call"]));
    if (rand() > 0.65) add(day(20), "income", "investment", between(1500, 4500), "Mutual fund dividend");

    add(day(3), "expense", "bills", 22000, "Rent");
    add(day(5), "expense", "bills", between(1800, 2700), "Electricity bill");
    add(day(7), "expense", "bills", 799, "Internet");

    for (let w = 0; w < 5; w++)
      add(day(2 + w * 6 + Math.floor(rand() * 3)), "expense", "food", between(1200, 3000),
        pick(["Groceries", "Supermarket run", "Vegetables & fruits"]));
    times(4, 8, () => add(anyDay(), "expense", "food", between(250, 1200),
      pick(["Dinner out", "Coffee with friends", "Lunch", "Pizza night"])));
    times(4, 7, () => add(anyDay(), "expense", "transport", between(150, 750),
      pick(["Metro card recharge", "Cab ride", "Fuel"])));
    times(1, 4, () => add(anyDay(), "expense", "shopping", between(800, 5000),
      pick(["New sneakers", "Headphones", "Home decor", "Clothes"])));
    times(1, 3, () => add(anyDay(), "expense", "entertainment", between(300, 2500),
      pick(["Movie tickets", "Streaming subscription", "Concert"])));
    times(0, 2, () => add(anyDay(), "expense", "health", between(500, 2500),
      pick(["Pharmacy", "Gym membership", "Doctor visit"])));
    times(0, 1.4, () => add(anyDay(), "expense", "education", between(500, 3000),
      pick(["Online course", "Books"])));
    times(0, 1.4, () => add(anyDay(), "expense", "other-expense", between(300, 2000),
      pick(["Gift for a friend", "Donation", "Laundry"])));
  }

  return { transactions, budgets: { ...DEFAULT_BUDGETS }, settings: { ...DEFAULT_SETTINGS } };
}
