"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Save, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabase-browser";

const currencyOptions = [
  ["IDR", "IDR — Rupiah Indonesia"], ["USD", "USD — Dolar Amerika"], ["SGD", "SGD — Dolar Singapura"],
  ["EUR", "EUR — Euro"], ["AUD", "AUD — Dolar Australia"],
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    getSupabaseBrowser().auth.getUser().then(({ data, error: authError }) => {
      if (!mounted) return;
      if (authError || !data.user) { router.replace("/login"); return; }
      setEmail(data.user.email ?? "");
      setFullName(String(data.user.user_metadata?.full_name ?? ""));
      setCurrency(String(data.user.user_metadata?.currency ?? "IDR"));
      setLoading(false);
    }).catch(() => {
      if (mounted) { setError("Profil belum dapat dimuat. Silakan coba lagi."); setLoading(false); }
    });
    return () => { mounted = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const cleanName = fullName.trim();
    if (cleanName.length < 2) { setError("Nama lengkap minimal 2 karakter."); return; }
    setSaving(true);
    const { error: updateError } = await getSupabaseBrowser().auth.updateUser({ data: { full_name: cleanName, currency } });
    if (updateError) setError(updateError.message);
    else { setFullName(cleanName); setNotice("Profil berhasil diperbarui."); router.refresh(); }
    setSaving(false);
  }

  return <main className="settings-shell"><section className="settings-card">
    <Link href="/dashboard" className="settings-back"><ArrowLeft size={17} /> Kembali ke ringkasan</Link>
    <div className="settings-brand"><span className="brand-mark"><WalletCards size={20} /></span><span>Pengaturan profil</span></div>
    <p className="settings-subtitle">Perbarui informasi profil dan mata uang utama akunmu.</p>
    {loading ? <div className="settings-loading"><LoaderCircle size={19} className="spin" /> Memuat profil...</div> : <form className="settings-form" onSubmit={saveProfile}>
      <label htmlFor="settings-name">Nama lengkap<input id="settings-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={100} required /></label>
      <label htmlFor="settings-email">Alamat email<input id="settings-email" type="email" value={email} readOnly /></label>
      <label htmlFor="settings-currency">Mata uang utama<select id="settings-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="settings-save" type="submit" disabled={saving}>{saving ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}{saving ? "Menyimpan..." : "Simpan perubahan"}</button>
    </form>}
  </section></main>;
}
