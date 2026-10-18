"use client";

import { useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type ExpenseTransaction = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  date: string;
};

const palette = [
  "#20a989", "#4e8bd8", "#f19a62", "#8b72d8", "#df6e75",
  "#d2a13d", "#48a8b8", "#d176a7", "#74a45b", "#77869a",
];

function makassarMonth(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Makassar", year: "numeric", month: "2-digit",
  }).formatToParts(value instanceof Date ? value : new Date(value));
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

const rupiah = (amount: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(amount);

export default function ExpenseCategoryDonut({ transactions, loading = false }: { transactions: ExpenseTransaction[]; loading?: boolean }) {
  const [activeMonth, setActiveMonth] = useState(() => makassarMonth(new Date()));

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.type !== "EXPENSE" || makassarMonth(transaction.date) !== activeMonth) continue;
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + Number(transaction.amount));
    }
    const entries = [...totals.entries()].map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length],
    })).sort((a, b) => b.value - a.value);
    const total = entries.reduce((sum, item) => sum + item.value, 0);
    return { entries, total };
  }, [transactions, activeMonth]);

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar", month: "long", year: "numeric",
  }).format(new Date(`${activeMonth}-01T00:00:00+08:00`));

  return (
    <section className="panel expense-breakdown-panel" aria-labelledby="expense-breakdown-title">
      <header className="expense-breakdown-header">
        <div>
          <h2 id="expense-breakdown-title">Pengeluaran per kategori</h2>
          <p>Ringkasan penggunaan uang pada bulan yang dipilih.</p>
        </div>
        <label className="expense-month-picker"><CalendarDays size={15} /><span className="sr-only">Pilih bulan</span><input type="month" value={activeMonth} onChange={(event) => setActiveMonth(event.target.value || makassarMonth(new Date()))} /></label>
      </header>

      {loading ? (
        <div className="expense-breakdown-empty"><LoaderCircle className="spin" size={24} /><p>Memuat ringkasan pengeluaran...</p></div>
      ) : !breakdown.entries.length ? (
        <div className="expense-breakdown-empty">
          <span><PieChartIcon size={23} /></span>
          <strong>Belum ada pengeluaran pada {monthLabel}</strong>
          <p>Transaksi pengeluaran bulan ini akan dirangkum di sini.</p>
        </div>
      ) : (
        <div className="expense-breakdown-content">
          <div className="expense-donut-wrap">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={breakdown.entries} dataKey="value" nameKey="name" innerRadius={69} outerRadius={101} paddingAngle={2} stroke="white" strokeWidth={3}>
                  {breakdown.entries.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ border: "1px solid #e9edf1", borderRadius: 10, boxShadow: "0 8px 24px #1d293910", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="expense-donut-center" aria-label={`Total pengeluaran ${rupiah(breakdown.total)}`}>
              <span>Total pengeluaran</span><strong>{rupiah(breakdown.total)}</strong>
            </div>
          </div>
          <ul className="expense-breakdown-legend">
            {breakdown.entries.map((entry) => {
              const percent = breakdown.total > 0 ? entry.value / breakdown.total * 100 : 0;
              return <li key={entry.name}>
                <span className="expense-legend-swatch" style={{ backgroundColor: entry.color }} />
                <span className="expense-legend-name">{entry.name}</span>
                <span className="expense-legend-value">{rupiah(entry.value)}</span>
                <span className="expense-legend-percent">{Math.round(percent)}%</span>
              </li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
