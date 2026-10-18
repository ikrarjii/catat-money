export type TransactionType = "INCOME" | "EXPENSE";
export type CategoryOption = { name: string; type: TransactionType; icon: string; color: string; isDefault?: boolean };

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { name: "Makanan", type: "EXPENSE", icon: "🍜", color: "#f29b72", isDefault: true },
  { name: "Transportasi", type: "EXPENSE", icon: "🚗", color: "#648ee8", isDefault: true },
  { name: "Belanja", type: "EXPENSE", icon: "🛍️", color: "#b27ad9", isDefault: true },
  { name: "Tagihan", type: "EXPENSE", icon: "🧾", color: "#e47878", isDefault: true },
  { name: "Kesehatan", type: "EXPENSE", icon: "💊", color: "#54b99b", isDefault: true },
  { name: "Hiburan", type: "EXPENSE", icon: "🎬", color: "#d78cae", isDefault: true },
  { name: "Pendidikan", type: "EXPENSE", icon: "📚", color: "#dfa949", isDefault: true },
  { name: "Gaji", type: "INCOME", icon: "💼", color: "#37aa89", isDefault: true },
  { name: "Bonus", type: "INCOME", icon: "🎁", color: "#67a1dd", isDefault: true },
  { name: "Investasi", type: "INCOME", icon: "📈", color: "#5eae78", isDefault: true },
  { name: "Lainnya", type: "EXPENSE", icon: "🏷️", color: "#8793a2", isDefault: true },
  { name: "Lainnya", type: "INCOME", icon: "🏷️", color: "#8793a2", isDefault: true },
];
