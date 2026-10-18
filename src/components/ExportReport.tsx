"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, LoaderCircle, X } from "lucide-react";

export type ReportTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
  source?: "TELEGRAM" | "WEB" | null;
};

type Props = { transactions: ReportTransaction[]; fullName: string; email: string };
type PeriodMode = "month" | "custom";
type ReportType = "ALL" | "INCOME" | "EXPENSE";

const dateInMakassar = (value: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(value));
const currentMonth = () => dateInMakassar(new Date().toISOString()).slice(0, 7);
const rupiah = (value: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);
const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar", day: "2-digit", month: "2-digit", year: "numeric",
}).format(new Date(value));
const timeLabel = (value: string) => new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(value));
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function ExportReport({ transactions, fullName, email }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState<"csv" | "pdf">("pdf");
  const [filterType, setFilterType] = useState<ReportType>("ALL");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const range = useMemo(() => periodMode === "month"
    ? { start: `${month}-01`, end: `${month}-31`, label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)) }
    : { start: startDate, end: endDate, label: startDate && endDate ? `${dateLabel(`${startDate}T00:00:00Z`)} – ${dateLabel(`${endDate}T00:00:00Z`)}` : "Rentang tanggal kustom" },
  [periodMode, month, startDate, endDate]);

  const reportRows = useMemo(() => transactions.filter((item) => {
    const date = dateInMakassar(item.date);
    if (!range.start || !range.end || date < range.start || date > range.end) return false;
    return filterType === "ALL" || item.type === filterType;
  }).sort((a, b) => a.date.localeCompare(b.date)), [transactions, range.start, range.end, filterType]);

  async function exportReport() {
    setToast(null);
    if (!range.start || !range.end) { setToast({ text: "Lengkapi tanggal mulai dan akhir.", error: true }); return; }
    if (range.start > range.end) { setToast({ text: "Tanggal mulai harus sebelum tanggal akhir.", error: true }); return; }
    if (!reportRows.length) { setToast({ text: "Tidak ada transaksi pada periode yang dipilih.", error: true }); return; }
    setBusy(true);
    try {
      const income = reportRows.filter((row) => row.type === "INCOME").reduce((sum, row) => sum + Number(row.amount), 0);
      const expense = reportRows.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + Number(row.amount), 0);
      const safePeriod = `${range.start}_${range.end}`;
      if (format === "csv") {
        const header = ["Tanggal", "Waktu", "Jenis", "Kategori", "Deskripsi", "Nominal (Rp)", "Sumber Pencatatan"];
        const rows = reportRows.map((row) => [dateLabel(row.date), timeLabel(row.date), row.type === "INCOME" ? "Pemasukan" : "Pengeluaran", row.category, row.description, Number(row.amount), row.source === "TELEGRAM" ? "Telegram" : row.source === "WEB" ? "Web" : "Tidak diketahui"]);
        const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = `catat-money-${safePeriod}.csv`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      } else {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.setTextColor(25, 91, 78); pdf.text("Catat Money", 14, 17);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(85, 98, 112);
        pdf.text(`Nama: ${fullName || "Pengguna Catat Money"}`, 14, 25);
        pdf.text(`Email: ${email || "-"}`, 14, 30);
        pdf.text(`Periode: ${range.label}`, 14, 35);
        pdf.setFont("helvetica", "bold"); pdf.setTextColor(35, 54, 73); pdf.setFontSize(10);
        pdf.text(`Total Pemasukan: ${rupiah(income)}`, 14, 45);
        pdf.text(`Total Pengeluaran: ${rupiah(expense)}`, 83, 45);
        pdf.text(`Selisih: ${rupiah(income - expense)}`, 164, 45);
        autoTable(pdf, {
          startY: 51,
          head: [["Tanggal", "Waktu", "Jenis", "Kategori", "Deskripsi", "Nominal (Rp)", "Sumber"]],
          body: reportRows.map((row) => [dateLabel(row.date), timeLabel(row.date), row.type === "INCOME" ? "Pemasukan" : "Pengeluaran", row.category, row.description || "-", rupiah(Number(row.amount)), row.source === "TELEGRAM" ? "Telegram" : row.source === "WEB" ? "Web" : "Tidak diketahui"]),
          styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [25, 91, 78] }, alternateRowStyles: { fillColor: [244, 248, 246] },
          columnStyles: { 4: { cellWidth: 62 }, 5: { halign: "right", cellWidth: 32 } },
          didDrawPage: () => {
            const pages = pdf.getNumberOfPages();
            pdf.setFontSize(8); pdf.setTextColor(125, 135, 145);
            pdf.text(`Diunduh ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" }).format(new Date())} • Halaman ${pdf.getCurrentPageInfo().pageNumber} dari ${pages}`, 14, pdf.internal.pageSize.getHeight() - 8);
          },
        });
        pdf.save(`catat-money-${safePeriod}.pdf`);
      }
      setOpen(false);
      setToast({ text: `Laporan ${format.toUpperCase()} berhasil diunduh.` });
    } catch (error) {
      console.error("Report export failed", error);
      setToast({ text: "Laporan belum dapat dibuat. Coba lagi.", error: true });
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" className="manage-category-button export-trigger" onClick={() => { setToast(null); setOpen(true); }}><Download size={16} /> Ekspor Laporan</button>
    {toast && <div className={`export-toast ${toast.error ? "is-error" : ""}`} role={toast.error ? "alert" : "status"}>{toast.text}<button type="button" onClick={() => setToast(null)} aria-label="Tutup notifikasi"><X size={14} /></button></div>}
    {open && <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="category-modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
        <header className="category-modal-header"><div><span className="eyebrow muted">LAPORAN KEUANGAN</span><h2 id="export-modal-title">Ekspor laporan</h2><p>Atur periode dan format laporan transaksi.</p></div><button type="button" className="modal-close" onClick={() => setOpen(false)} disabled={busy} aria-label="Tutup"><X size={20} /></button></header>
        <div className="export-form">
          <fieldset><legend>Periode laporan</legend><div className="export-choice-row"><label><input type="radio" checked={periodMode === "month"} onChange={() => setPeriodMode("month")} /> Bulan</label><label><input type="radio" checked={periodMode === "custom"} onChange={() => setPeriodMode("custom")} /> Rentang kustom</label></div>
            {periodMode === "month" ? <label className="export-field">Bulan & tahun<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label> : <div className="export-date-grid"><label className="export-field">Dari<input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label><label className="export-field">Sampai<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label></div>}
          </fieldset>
          <fieldset><legend>Format file</legend><div className="export-format-grid"><label className={format === "pdf" ? "chosen" : ""}><input type="radio" checked={format === "pdf"} onChange={() => setFormat("pdf")} /><FileText size={19} /><span><strong>PDF</strong><small>Laporan siap cetak</small></span></label><label className={format === "csv" ? "chosen" : ""}><input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} /><FileSpreadsheet size={19} /><span><strong>CSV / Excel</strong><small>Buka di Excel atau Sheets</small></span></label></div></fieldset>
          <label className="export-field">Jenis transaksi<select value={filterType} onChange={(event) => setFilterType(event.target.value as ReportType)}><option value="ALL">Semua transaksi</option><option value="INCOME">Hanya pemasukan</option><option value="EXPENSE">Hanya pengeluaran</option></select></label>
          <div className="export-preview"><strong>{reportRows.length} transaksi</strong><span>akan dimasukkan • Periode {range.label}</span></div>
          <button type="button" className="export-submit" onClick={() => void exportReport()} disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" /> Mengunduh Laporan...</> : <><Download size={17} /> Unduh Laporan</>}</button>
        </div>
      </section>
    </div>}
  </>;
}
