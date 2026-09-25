export const CATEGORIES = {
  expense: [
    { id: "food", label: "Food & Dining", icon: "🍜", color: "#f97316" },
    { id: "transport", label: "Transport", icon: "🚇", color: "#3b82f6" },
    { id: "shopping", label: "Shopping", icon: "🛍️", color: "#ec4899" },
    { id: "bills", label: "Bills & Rent", icon: "🧾", color: "#eab308" },
    { id: "entertainment", label: "Entertainment", icon: "🎬", color: "#8b5cf6" },
    { id: "health", label: "Health", icon: "💊", color: "#10b981" },
    { id: "education", label: "Education", icon: "📚", color: "#06b6d4" },
    { id: "other-expense", label: "Other", icon: "📦", color: "#94a3b8" },
  ],
  income: [
    { id: "salary", label: "Salary", icon: "💼", color: "#22c55e" },
    { id: "freelance", label: "Freelance", icon: "💻", color: "#14b8a6" },
    { id: "investment", label: "Investments", icon: "📈", color: "#6366f1" },
    { id: "gift", label: "Gifts", icon: "🎁", color: "#f43f5e" },
    { id: "other-income", label: "Other", icon: "💰", color: "#a3a3a3" },
  ],
};

const BY_ID = new Map(
  Object.entries(CATEGORIES).flatMap(([type, list]) => list.map((c) => [c.id, { ...c, type }]))
);

const FALLBACK = { id: "unknown", label: "Uncategorized", icon: "❔", color: "#94a3b8" };

export const getCategory = (id) => BY_ID.get(id) ?? FALLBACK;

/** Resolve a category by id or (case-insensitive) label for the given type. */
export function resolveCategory(value, type) {
  const v = String(value ?? "").trim().toLowerCase();
  const list = CATEGORIES[type] ?? [];
  return (
    list.find((c) => c.id === v || c.label.toLowerCase() === v)?.id ??
    (type === "income" ? "other-income" : "other-expense")
  );
}
