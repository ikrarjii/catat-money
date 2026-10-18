"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageCircle, Pencil, Plus, RefreshCw, Search, Send, Trash2, Wallet, WalletCards, X } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { DEFAULT_CATEGORIES, type CategoryOption, type TransactionType } from "../../lib/categories";
import UserDropdown from "../../components/UserDropdown";
import ExpenseCategoryDonut from "../../components/ExpenseCategoryDonut";
import ExportReport from "../../components/ExportReport";

type Transaction = { id: string; type: "INCOME" | "EXPENSE"; amount: number; category: string; description: string; date: string; created_at: string; source?: "TELEGRAM" | "WEB" | null };
type CustomCategory = CategoryOption & { id: string };
type Budget = { id: string; user_id: string; category_name: string; amount_limit: number; month: string; created_at: string };
type Profile = { email: string; id: string; fullName: string };
type DatePreset = "all" | "today" | "7days" | "month" | "custom";

const dateAtMakassar = (value: string) => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const currentMakassarMonth = () => dateAtMakassar(new Date().toISOString()).slice(0, 7);

const currency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
const shortDate = (value: string) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function DashboardPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkLoading, setLinkLoading] = useState(false);
  const [deepLink, setDeepLink] = useState("");
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [categoryNotice, setCategoryNotice] = useState("");
  const [manageCategories, setManageCategories] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<TransactionType>("EXPENSE");
  const [categoryIcon, setCategoryIcon] = useState("🏷️");
  const [categoryColor, setCategoryColor] = useState("#21b596");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetMonth, setBudgetMonth] = useState(currentMakassarMonth);
  const [manageBudgets, setManageBudgets] = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetNotice, setBudgetNotice] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { router.replace("/login"); return; }
    setProfile({ id: user.id, email: user.email ?? "", fullName: String(user.user_metadata?.full_name ?? "") });
    const telegramProfileRequest = supabase.from("users").select("telegram_chat_id").eq("id", user.id).maybeSingle();
    const categoriesRequest = supabase.from("categories").select("id,name,type,icon,color").eq("user_id", user.id).order("name");
    const rows: Transaction[] = [];
    let readError: { message: string } | null = null;
    let supportsTransactionSource = true;
    for (let from = 0; ; from += 1000) {
      let data: Transaction[] | null;
      let error: { message: string } | null;
      if (supportsTransactionSource) {
        const result = await supabase.from("transactions")
          .select("id,type,amount,category,description,date,created_at,source")
          .order("date", { ascending: false }).range(from, from + 999);
        // Keep existing dashboards usable until the optional source-column migration is applied.
        if (result.error && /source.*(schema cache|column|does not exist)|column.*source/i.test(result.error.message)) {
          supportsTransactionSource = false;
          const fallback = await supabase.from("transactions")
            .select("id,type,amount,category,description,date,created_at")
            .order("date", { ascending: false }).range(from, from + 999);
          data = fallback.data as Transaction[] | null;
          error = fallback.error;
        } else {
          data = result.data as Transaction[] | null;
          error = result.error;
        }
      } else {
        const result = await supabase.from("transactions")
          .select("id,type,amount,category,description,date,created_at")
          .order("date", { ascending: false }).range(from, from + 999);
        data = result.data as Transaction[] | null;
        error = result.error;
      }
      if (error) { readError = error; break; }
      rows.push(...((data ?? []) as Transaction[]));
      if (!data || data.length < 1000) break;
    }
    const { data: telegramProfile } = await telegramProfileRequest;
    const { data: categoryRows, error: categoryReadError } = await categoriesRequest;
    if (categoryReadError) setCategoryNotice("Jalankan migrasi SQL kategori untuk mengaktifkan kategori kustom.");
    else { setCustomCategories((categoryRows ?? []) as CustomCategory[]); setCategoryNotice(""); }
    if (readError) setNotice("Sebagian data transaksi belum dapat dimuat. Periksa koneksi dan kebijakan RLS Supabase.");
    else { setNotice(""); setTransactions(rows); }
    setTelegramConnected(Boolean(telegramProfile?.telegram_chat_id));
    setLoading(false);
  }, [router]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("dashboard-transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        void loadData();
      })
      .subscribe();

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, 12_000);

    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    if (!deepLink || telegramConnected || !profile) return;
    const timer = window.setInterval(async () => {
      const { data } = await getSupabaseBrowser().from("users").select("telegram_chat_id").eq("id", profile.id).maybeSingle();
      if (data?.telegram_chat_id) { setTelegramConnected(true); setDeepLink(""); }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [deepLink, profile, telegramConnected]);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    setBudgetLoading(true);
    getSupabaseBrowser().from("budgets").select("id,user_id,category_name,amount_limit,month,created_at")
      .eq("user_id", profile.id).eq("month", budgetMonth).order("category_name")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setBudgetNotice("Jalankan migrasi SQL anggaran untuk mengaktifkan fitur ini.");
        else { setBudgets((data ?? []) as Budget[]); setBudgetNotice(""); }
        setBudgetLoading(false);
      }, () => {
        if (!active) return;
        setBudgetNotice("Anggaran belum dapat dimuat. Periksa koneksi lalu coba lagi.");
        setBudgetLoading(false);
      });
    return () => { active = false; };
  }, [profile?.id, budgetMonth]);

  const allCategories = useMemo(() => {
    const categories = [...DEFAULT_CATEGORIES, ...customCategories];
    for (const transaction of transactions) {
      if (!categories.some((category) => category.name.toLocaleLowerCase("id-ID") === transaction.category.toLocaleLowerCase("id-ID"))) {
        categories.push({ name: transaction.category, type: transaction.type, icon: "🏷️", color: "#8793a2" });
      }
    }
    return categories;
  }, [customCategories, transactions]);

  const dateBounds = useMemo(() => {
    const today = dateAtMakassar(new Date().toISOString());
    if (datePreset === "today") return { start: today, end: today };
    if (datePreset === "7days") return { start: shiftDate(today, -6), end: today };
    if (datePreset === "month") return { start: `${today.slice(0, 7)}-01`, end: today };
    if (datePreset === "custom") return { start: customStartDate, end: customEndDate };
    return { start: "", end: "" };
  }, [datePreset, customStartDate, customEndDate]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("id-ID");
    return transactions.filter((transaction) => {
      const transactionDate = dateAtMakassar(transaction.date);
      if (dateBounds.start && transactionDate < dateBounds.start) return false;
      if (dateBounds.end && transactionDate > dateBounds.end) return false;
      if (typeFilter !== "ALL" && transaction.type !== typeFilter) return false;
      if (categoryFilter !== "ALL" && transaction.category !== categoryFilter) return false;
      if (query && !`${transaction.description} ${transaction.category}`.toLocaleLowerCase("id-ID").includes(query)) return false;
      return true;
    });
  }, [transactions, dateBounds, typeFilter, categoryFilter, searchQuery]);

  const budgetSpending = useMemo(() => {
    const spending = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.type !== "EXPENSE" || dateAtMakassar(transaction.date).slice(0, 7) !== budgetMonth) return;
      spending.set(transaction.category, (spending.get(transaction.category) ?? 0) + Number(transaction.amount));
    });
    return spending;
  }, [transactions, budgetMonth]);

  const budgetCategories = useMemo(() => {
    const names = allCategories.filter((category) => category.type === "EXPENSE").map((category) => category.name);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [allCategories]);

  function resetCategoryForm() {
    setEditingCategoryId(null); setCategoryName(""); setCategoryType("EXPENSE"); setCategoryIcon("🏷️"); setCategoryColor("#21b596"); setCategoryNotice("");
  }

  function editCategory(category: CustomCategory) {
    setEditingCategoryId(category.id); setCategoryName(category.name); setCategoryType(category.type); setCategoryIcon(category.icon); setCategoryColor(category.color); setCategoryNotice("");
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { setCategoryNotice("Isi nama kategori terlebih dahulu."); return; }
    if ([...DEFAULT_CATEGORIES, ...customCategories.filter((item) => item.id !== editingCategoryId)].some((item) => item.type === categoryType && item.name.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID"))) {
      setCategoryNotice("Nama kategori dengan jenis ini sudah tersedia."); return;
    }
    if (!profile) { setCategoryNotice("Sesi akun belum siap. Coba buka kembali dialog kategori."); return; }
    setCategorySaving(true); setCategoryNotice("");
    try {
      const supabase = getSupabaseBrowser();
      const values = { name, type: categoryType, icon: categoryIcon, color: categoryColor };
      const result = editingCategoryId
        ? await supabase.from("categories").update(values).eq("id", editingCategoryId).select("id,name,type,icon,color").single()
        : await supabase.from("categories").insert({ ...values, user_id: profile?.id }).select("id,name,type,icon,color").single();
      if (result.error) throw result.error;
      setCustomCategories((previous) => editingCategoryId
        ? previous.map((item) => item.id === editingCategoryId ? result.data as CustomCategory : item)
        : [...previous, result.data as CustomCategory]);
      resetCategoryForm();
    } catch (error) {
      setCategoryNotice(error instanceof Error ? error.message : "Kategori belum dapat disimpan.");
    } finally { setCategorySaving(false); }
  }

  async function deleteCategory(category: CustomCategory) {
    if (!window.confirm(`Hapus kategori “${category.name}”? Transaksi lama tetap tersimpan dengan nama kategori ini.`)) return;
    setCategorySaving(true); setCategoryNotice("");
    const { error } = await getSupabaseBrowser().from("categories").delete().eq("id", category.id);
    if (error) setCategoryNotice(error.message);
    else {
      setCustomCategories((previous) => previous.filter((item) => item.id !== category.id));
      if (editingCategoryId === category.id) resetCategoryForm();
    }
    setCategorySaving(false);
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBudgetNotice("");
    const limit = Number(budgetAmount);
    if (!profile) { setBudgetNotice("Sesi akun belum siap. Muat ulang dashboard dan coba lagi."); return; }
    if (!budgetCategory) { setBudgetNotice("Pilih kategori pengeluaran."); return; }
    if (!Number.isFinite(limit) || limit <= 0) { setBudgetNotice("Batas anggaran harus lebih besar dari nol."); return; }
    setBudgetSaving(true);
    try {
      const { data, error } = await getSupabaseBrowser().from("budgets")
        .upsert({ user_id: profile.id, category_name: budgetCategory, amount_limit: limit, month: budgetMonth }, { onConflict: "user_id,category_name,month" })
        .select("id,user_id,category_name,amount_limit,month,created_at").single();
      if (error) throw error;
      setBudgets((previous) => [...previous.filter((item) => item.id !== (data as Budget).id && !(item.category_name === budgetCategory && item.month === budgetMonth)), data as Budget].sort((a, b) => a.category_name.localeCompare(b.category_name, "id-ID")));
      setBudgetAmount(""); setEditingBudgetId(null); setBudgetNotice("Batas anggaran berhasil disimpan.");
    } catch (error) {
      setBudgetNotice(error instanceof Error ? error.message : "Anggaran belum dapat disimpan.");
    } finally { setBudgetSaving(false); }
  }

  async function deleteBudget(budget: Budget) {
    if (!window.confirm(`Hapus anggaran ${budget.category_name} untuk ${budget.month}?`)) return;
    setBudgetSaving(true); setBudgetNotice("");
    const { error } = await getSupabaseBrowser().from("budgets").delete().eq("id", budget.id);
    if (error) setBudgetNotice(error.message);
    else setBudgets((previous) => previous.filter((item) => item.id !== budget.id));
    setBudgetSaving(false);
  }

  const summary = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = filteredTransactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + Number(t.amount), 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
    return months.map((month) => {
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const entries = transactions.filter((t) => t.date.slice(0, 7) === key);
      return { bulan: new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", month: "short" }).format(month), pemasukan: entries.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0), pengeluaran: entries.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0) };
    });
  }, [transactions]);

  async function connectTelegram() {
    setLinkLoading(true); setLinkError(""); setDeepLink("");
    try {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const response = await fetch("/api/telegram/link", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Link Telegram belum dapat dibuat.");
      setDeepLink(body.deepLink);
    } catch (error) { setLinkError(error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi."); }
    finally { setLinkLoading(false); }
  }

  async function signOut() { await getSupabaseBrowser().auth.signOut(); router.replace("/login"); }
  const displayName = profile?.fullName || profile?.email?.split("@")[0] || "Pengguna Catat Money";

  return (
    <main className="dashboard-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <Link href="/dashboard" className="brand sidebar-brand"><span className="brand-mark"><WalletCards size={21} /></span>catat<span className="brand-light">money</span></Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav"><a className="nav-item nav-active" href="#overview" onClick={() => setMobileNav(false)}><LayoutDashboard size={18} />Ringkasan</a><a className="nav-item" href="#transactions" onClick={() => setMobileNav(false)}><ArrowLeftRight size={18} />Transaksi<span className="nav-count">{transactions.length}</span></a></nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><strong>Butuh bantuan?</strong><p>Pelajari cara mencatat transaksi lewat Telegram.</p><a href="#telegram">Lihat panduan <ArrowUpRight size={13} /></a></div><button className="nav-item signout" onClick={signOut}><LogOut size={18} />Keluar</button></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setMobileNav(false)} />}

      <section className="dashboard-main">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Buka menu"><Menu size={20} /></button><div className="breadcrumb">Workspace <span>/</span> <strong>Ringkasan</strong></div><div className="topbar-right"><span className="today-label"><CalendarDays size={15} />{new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Makassar", weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span><button className="icon-button" aria-label="Notifikasi"><Bell size={18} /><i /></button><UserDropdown fullName={displayName} email={profile?.email ?? "Memuat akun"} onManageCategories={() => setManageCategories(true)} /></div></header>

        <div className="page-content" id="overview"><div className="welcome-row"><div><span className="eyebrow muted">RINGKASAN KEUANGAN</span><h1>Selamat datang{profile ? `, ${displayName}` : ""} </h1><p>Pantau arus uangmu dan tetap selangkah di depan.</p></div><button className="outline-button" onClick={() => void loadData()}><RefreshCw size={15} /> Perbarui</button></div>

          {notice && <div className="notice-banner">{notice}</div>}
          <div className="summary-grid">
            <article className="summary-card balance-card"><div className="card-top"><span>Total saldo</span><span className="summary-icon"><Wallet size={18} /></span></div><div className="summary-value">{loading ? <span className="skeleton-value" /> : currency(summary.balance)}</div><div className="card-foot"><span className="balance-status"><span /> Posisi keuanganmu</span><span className="period-label">{datePreset === "all" && typeFilter === "ALL" && categoryFilter === "ALL" && !searchQuery ? "Semua waktu" : "Sesuai filter"}</span></div><div className="balance-decoration" /></article>
            <article className="summary-card"><div className="card-top"><span>Total pemasukan</span><span className="summary-icon green"><ArrowDownLeft size={18} /></span></div><div className="summary-value">{loading ? <span className="skeleton-value" /> : currency(summary.income)}</div><div className="card-foot"><span className="trend-positive"><ArrowDownLeft size={13} /> Uang masuk</span><span className="period-label">{datePreset === "all" && typeFilter === "ALL" && categoryFilter === "ALL" && !searchQuery ? "Semua waktu" : "Sesuai filter"}</span></div></article>
            <article className="summary-card"><div className="card-top"><span>Total pengeluaran</span><span className="summary-icon coral"><ArrowUpRight size={18} /></span></div><div className="summary-value">{loading ? <span className="skeleton-value" /> : currency(summary.expenses)}</div><div className="card-foot"><span className="trend-neutral"><ArrowUpRight size={13} /> Uang keluar</span><span className="period-label">{datePreset === "all" && typeFilter === "ALL" && categoryFilter === "ALL" && !searchQuery ? "Semua waktu" : "Sesuai filter"}</span></div></article>
          </div>

          <div className="content-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Arus kas</h2><p>Perbandingan pemasukan dan pengeluaran</p></div><span className="chart-period"><CalendarDays size={14} /> 6 bulan terakhir <ChevronDown size={14} /></span></div><div className="chart-legend"><span><i className="legend-income" />Pemasukan</span><span><i className="legend-expense" />Pengeluaran</span></div><div className="chart-wrap">{loading ? <div className="chart-loading"><LoaderCircle className="spin" /> Memuat grafik...</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={7} barCategoryGap="28%"><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="4 5" /><XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: "#929ba8", fontSize: 12 }} dy={12} /><YAxis axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${v / 1000000}jt` : v >= 1000 ? `${v / 1000}k` : String(v)} tick={{ fill: "#929ba8", fontSize: 11 }} width={48} /><Tooltip formatter={(value) => currency(Number(value))} cursor={{ fill: "#f7f8fa" }} contentStyle={{ border: "1px solid #edf0f4", borderRadius: 12, boxShadow: "0 8px 24px #1d293910" }} /><Bar dataKey="pemasukan" fill="#25b99a" radius={[5, 5, 0, 0]} maxBarSize={22} /><Bar dataKey="pengeluaran" fill="#f3a58c" radius={[5, 5, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer>}</div></section>

            <section className="panel telegram-panel" id="telegram"><div className="telegram-header"><span className="telegram-icon"><Send size={19} /></span><span className={`status-pill ${telegramConnected ? "" : "status-pending"}`}><span />{telegramConnected ? "TELEGRAM TERHUBUNG" : "SIAP DIHUBUNGKAN"}</span></div><h2>Catat lewat Telegram</h2><p>Kirim pesan sederhana, biar bot membantu mencatat transaksi untukmu.</p><div className="telegram-demo"><span className="demo-label">CONTOH PESAN</span><div className="demo-bubble">Beli kopi susu 28rb tadi pagi<span>09.41 <Check size={12} /></span></div><div className="demo-result"><Check size={14} /><span>Pengeluaran <b>Rp28.000</b> berhasil dicatat</span></div></div>
              {!deepLink ? <><button className="telegram-button" onClick={() => void connectTelegram()} disabled={linkLoading}>{linkLoading ? <LoaderCircle size={17} className="spin" /> : <MessageCircle size={17} />}{linkLoading ? "Menyiapkan link..." : telegramConnected ? "Hubungkan ulang Telegram" : "Hubungkan Telegram"}<ArrowUpRight size={15} /></button>{linkError && <p className="link-error">{linkError}</p>}<span className="secure-note"><span />Link aman dan berlaku 10 menit</span></> : <div className="qr-result"><div className="qr-frame"><QRCodeSVG value={deepLink} size={126} level="M" includeMargin /></div><div><strong>Pindai untuk menghubungkan</strong><p>Buka kamera Telegram atau gunakan tombol di bawah.</p><a className="telegram-button" href={deepLink} target="_blank" rel="noreferrer"><Send size={16} /> Buka Telegram <ArrowUpRight size={14} /></a><button className="text-button" onClick={() => setDeepLink("")}>Batalkan link</button></div></div>}
            </section></div>

          <ExpenseCategoryDonut transactions={transactions} loading={loading} />

          <section className="panel transactions-panel" id="transactions">
            <div className="panel-heading transaction-panel-heading">
              <div><h2>Transaksi terbaru</h2><p>{filteredTransactions.length} hasil sesuai filter</p></div>
              <div className="transaction-heading-actions"><span className="transaction-count">{filteredTransactions.length} transaksi</span><ExportReport transactions={transactions} fullName={displayName} email={profile?.email ?? ""} /><button className="manage-category-button" onClick={() => setManageBudgets(true)}><Wallet size={16} /> Kelola anggaran</button><button className="manage-category-button" onClick={() => setManageCategories(true)}><WalletCards size={16} /> Kelola kategori</button></div>
            </div>
            <div className="transaction-filters" aria-label="Filter transaksi">
              <div className="filter-date-presets" aria-label="Rentang tanggal">
                {[{ id: "all", label: "Semua" }, { id: "today", label: "Hari ini" }, { id: "7days", label: "7 hari" }, { id: "month", label: "Bulan ini" }, { id: "custom", label: "Kustom" }].map((preset) => <button key={preset.id} type="button" className={`filter-preset ${datePreset === preset.id ? "selected" : ""}`} onClick={() => setDatePreset(preset.id as DatePreset)}>{preset.label}</button>)}
              </div>
              {datePreset === "custom" && <div className="date-range-inputs"><label>Dari <input type="date" value={customStartDate} max={customEndDate || undefined} onChange={(event) => setCustomStartDate(event.target.value)} /></label><label>Sampai <input type="date" value={customEndDate} min={customStartDate || undefined} onChange={(event) => setCustomEndDate(event.target.value)} /></label></div>}
              <div className="filter-controls">
                <label className="filter-select-label"><span>Jenis</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "ALL" | TransactionType)}><option value="ALL">Semua jenis</option><option value="INCOME">Pemasukan</option><option value="EXPENSE">Pengeluaran</option></select></label>
                <label className="filter-select-label"><span>Kategori</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">Semua kategori</option>{allCategories.map((category, index) => <option key={`${category.type}-${category.name}-${index}`} value={category.name}>{category.icon} {category.name}</option>)}</select></label>
                <div className="transaction-search"><Search size={17} /><input type="search" aria-label="Cari nama atau deskripsi transaksi" placeholder="Cari transaksi..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><button type="button" onClick={() => { setDatePreset("all"); setCustomStartDate(""); setCustomEndDate(""); setTypeFilter("ALL"); setCategoryFilter("ALL"); setSearchQuery(""); }}>Reset filter</button></div>
              </div>
            </div>
            <div className="table-scroll"><table className="transaction-table"><thead><tr><th>TRANSAKSI</th><th>KATEGORI</th><th>TANGGAL</th><th>JENIS</th><th className="amount-heading">NOMINAL</th></tr></thead><tbody>
              {loading ? <tr><td colSpan={5} className="empty-state"><LoaderCircle className="spin" size={20} />Memuat transaksi...</td></tr> : filteredTransactions.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><span className="empty-icon"><ArrowLeftRight size={20} /></span><strong>Tidak ada transaksi yang cocok</strong><span>Ubah atau reset filter untuk melihat transaksi lainnya.</span></div></td></tr> : filteredTransactions.map((transaction) => <tr key={transaction.id}><td><div className="transaction-name"><span className={`transaction-icon ${transaction.type === "INCOME" ? "income" : "expense"}`}>{transaction.type === "INCOME" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{transaction.description || transaction.category}</strong><small>{transaction.description && transaction.description !== transaction.category ? transaction.category : "Catatan transaksi"}</small></span></div></td><td><span className="category-tag">{transaction.category}</span></td><td><span className="date-cell"><Clock3 size={14} />{shortDate(transaction.date)}</span></td><td><span className={`type-tag ${transaction.type === "INCOME" ? "type-income" : "type-expense"}`}>{transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}</span></td><td className={`amount-cell ${transaction.type === "INCOME" ? "amount-income" : ""}`}>{transaction.type === "INCOME" ? "+ " : "− "}{currency(Number(transaction.amount))}</td></tr>)}
            </tbody></table></div>
            <div className="table-footer"><span>Menampilkan {filteredTransactions.length} transaksi terfilter</span><span>Data diperbarui langsung dari akunmu <span className="live-dot" /></span></div>
          </section>

          {manageCategories && <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setManageCategories(false); resetCategoryForm(); } }}>
            <section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
              <header className="category-modal-header"><div><span className="eyebrow muted">PREFERENSI TRANSAKSI</span><h2 id="category-modal-title">Kelola kategori</h2><p>Kategori bawaan dan kategori khusus akunmu.</p></div><button className="modal-close" onClick={() => { setManageCategories(false); resetCategoryForm(); }} aria-label="Tutup"><X size={20} /></button></header>
              {categoryNotice && <p className="form-error category-message" role="alert">{categoryNotice}</p>}
              <div className="category-lists"><div className="category-list-column"><h3>Kategori bawaan</h3><div className="category-chip-list">{DEFAULT_CATEGORIES.map((category, index) => <span className="category-manage-chip" key={`${category.type}-${category.name}-${index}`}><i style={{ background: category.color }}>{category.icon}</i>{category.name}<small>{category.type === "INCOME" ? "Masuk" : "Keluar"}</small></span>)}</div></div>
                <div className="category-list-column"><h3>Kategori kustom <span>{customCategories.length}</span></h3>{customCategories.length === 0 ? <p className="category-empty">Belum ada kategori kustom.</p> : <div className="custom-category-list">{customCategories.map((category) => <div className="custom-category-row" key={category.id}><span className="category-manage-chip"><i style={{ background: category.color }}>{category.icon}</i>{category.name}<small>{category.type === "INCOME" ? "Masuk" : "Keluar"}</small></span><div><button type="button" onClick={() => editCategory(category)} aria-label={`Edit ${category.name}`}><Pencil size={15} /></button><button type="button" onClick={() => void deleteCategory(category)} disabled={categorySaving} aria-label={`Hapus ${category.name}`}><Trash2 size={15} /></button></div></div>)}</div>}</div>
              </div>
              <form className="category-form" onSubmit={saveCategory}><h3>{editingCategoryId ? "Edit kategori" : "Tambah kategori"}</h3><div className="category-form-grid"><label>Nama kategori<input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={40} placeholder="Contoh: Kopi" required /></label><label>Jenis<select value={categoryType} onChange={(event) => setCategoryType(event.target.value as TransactionType)}><option value="EXPENSE">Pengeluaran</option><option value="INCOME">Pemasukan</option></select></label><label>Ikon<select value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)}>{["🏷️", "🍜", "🚗", "🛍️", "🧾", "💊", "🎬", "📚", "💼", "🎁", "📈", "🏠", "🐾", "☕"].map((icon) => <option key={icon} value={icon}>{icon}</option>)}</select></label><label>Warna<input className="category-color-input" type="color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} /></label></div><div className="category-form-actions">{editingCategoryId && <button type="button" className="category-cancel" onClick={resetCategoryForm}>Batal edit</button>}<button className="manage-category-button" type="submit" disabled={categorySaving}>{categorySaving ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}{editingCategoryId ? "Simpan perubahan" : "Tambah kategori"}</button></div></form>
            </section>
          </div>}
          {manageBudgets && <div className="category-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setManageBudgets(false); }}>
            <section className="category-modal budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
              <header className="category-modal-header"><div><span className="eyebrow muted">BATAS PENGELUARAN</span><h2 id="budget-modal-title">Anggaran bulanan</h2><p>Atur batas dan pantau pemakaian per kategori.</p></div><button className="modal-close" onClick={() => setManageBudgets(false)} aria-label="Tutup"><X size={20} /></button></header>
              <label className="budget-month-select">Bulan anggaran<input type="month" value={budgetMonth} onChange={(event) => { setBudgetMonth(event.target.value); setEditingBudgetId(null); setBudgetAmount(""); }} /></label>
              {budgetNotice && <p className={budgetNotice.startsWith("Batas anggaran berhasil") ? "form-notice category-message" : "form-error category-message"} role={budgetNotice.startsWith("Batas anggaran berhasil") ? "status" : "alert"}>{budgetNotice}</p>}
              <div className="budget-list-heading"><h3>Progres anggaran</h3><span>{budgetMonth}</span></div>
              {budgetLoading ? <div className="settings-loading"><LoaderCircle size={18} className="spin" /> Memuat anggaran...</div> : budgets.length === 0 ? <div className="budget-empty"><Wallet size={21} /><strong>Belum ada anggaran bulan ini</strong><span>Tambahkan batas untuk kategori pengeluaran di bawah.</span></div> : <div className="budget-list">{budgets.map((budget) => {
                const spent = budgetSpending.get(budget.category_name) ?? 0;
                const limit = Number(budget.amount_limit);
                const percent = limit > 0 ? spent / limit * 100 : 0;
                const stateClass = percent >= 100 ? "over" : percent >= 75 ? "near" : "safe";
                const icon = allCategories.find((category) => category.name === budget.category_name && category.type === "EXPENSE")?.icon ?? "🏷️";
                return <article className="budget-card" key={budget.id}><div className="budget-card-top"><span className="budget-category-title"><i>{icon}</i><span><strong>{budget.category_name}</strong><small>{currency(spent)} dari {currency(limit)}</small></span></span><span className={`budget-percent ${stateClass}`}>{Math.round(percent)}%</span></div><div className="budget-progress-track"><span className={`budget-progress-fill ${stateClass}`} style={{ width: `${Math.min(percent, 100)}%` }} /></div><div className="budget-card-bottom"><span>{percent >= 100 ? `Melebihi ${currency(Math.max(0, spent - limit))}` : `Sisa ${currency(Math.max(0, limit - spent))}`}</span><div><button type="button" onClick={() => { setEditingBudgetId(budget.id); setBudgetCategory(budget.category_name); setBudgetAmount(String(limit)); setBudgetNotice(""); }} aria-label={`Ubah anggaran ${budget.category_name}`}><Pencil size={14} /></button><button type="button" onClick={() => void deleteBudget(budget)} disabled={budgetSaving} aria-label={`Hapus anggaran ${budget.category_name}`}><Trash2 size={14} /></button></div></div></article>;
              })}</div>}
              <form className="category-form budget-form" onSubmit={saveBudget}><h3>{editingBudgetId ? "Ubah batas anggaran" : "Tetapkan batas anggaran"}</h3><div className="budget-form-grid"><label>Kategori pengeluaran<select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)} required><option value="">Pilih kategori</option>{budgetCategories.map((name) => <option value={name} key={name}>{name}</option>)}</select></label><label>Batas per bulan (Rp)<input type="number" min="1" step="1000" inputMode="numeric" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="500000" required /></label></div><div className="category-form-actions">{editingBudgetId && <button type="button" className="category-cancel" onClick={() => { setEditingBudgetId(null); setBudgetAmount(""); }}>Batal edit</button>}<button className="manage-category-button" type="submit" disabled={budgetSaving}>{budgetSaving ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}{editingBudgetId ? "Simpan perubahan" : "Simpan anggaran"}</button></div></form>
              <p className="budget-warning-help">Bot Telegram akan mengirim peringatan saat pemakaian mencapai 80% dan memberi tanda bahaya saat mencapai batas.</p>
            </section>
          </div>}
          <footer className="dashboard-footer"><span>© 2026 Catat Money</span><span>Dibuat untuk mengelola uang dengan lebih baik <span>♥</span></span></footer>
        </div>
      </section>
    </main>
  );
}
