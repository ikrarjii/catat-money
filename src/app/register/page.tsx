"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, WalletCards } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

const currencies = [
  { value: "IDR", label: "IDR — Rupiah Indonesia" },
  { value: "USD", label: "USD — Dolar Amerika" },
  { value: "SGD", label: "SGD — Dolar Singapura" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "AUD", label: "AUD — Dolar Australia" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) { setError("Masukkan nama lengkap (minimal 2 karakter). "); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) { setError("Format email belum valid."); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError("Kata sandi harus minimal 8 karakter dan memuat huruf serta angka."); return; }
    if (password !== confirmPassword) { setError("Konfirmasi kata sandi belum cocok."); return; }

    setLoading(true);
    try {
      const { data, error: authError } = await getSupabaseBrowser().auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName, currency } },
      });
      if (authError) throw authError;
      if (data.session) {
        document.cookie = `cm-remember=1; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        router.replace("/dashboard");
        router.refresh();
      } else {
        setNotice("Pendaftaran berhasil. Periksa email untuk verifikasi, lalu masuk ke akunmu.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/" className="brand"><span className="brand-mark"><WalletCards size={21} /></span>catat<span className="brand-light">money</span></Link>
        <div className="story-copy"><span className="eyebrow"><span className="pulse-dot" /> MULAI DARI LANGKAH KECIL</span><h1>Bangun kebiasaan<br /><em>finansial yang sehat.</em></h1><p>Buat akun gratis dan mulai lihat gambaran keuanganmu dengan lebih utuh.</p><div className="story-quote"><div className="quote-avatar">C</div><div><p>Catat transaksi lewat web atau langsung dari Telegram.</p><span>Satu tempat untuk semua catatanmu</span></div></div></div>
        <div className="story-footer"><span>© 2026 Catat Money</span><span>Privat · Aman · Terhubung</span></div>
      </section>
      <section className="auth-panel"><div className="auth-card"><div className="mobile-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></div><span className="eyebrow muted">BUAT AKUN BARU</span><h2>Mulai catat uangmu</h2><p className="auth-subtitle">Gratis, praktis, dan siap digunakan kapan saja.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="full-name">Nama lengkap</label><div className="input-wrap"><UserRound size={18} /><input id="full-name" type="text" autoComplete="name" placeholder="Nama lengkapmu" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} /></div>
          <label htmlFor="email">Alamat email</label><div className="input-wrap"><Mail size={18} /><input id="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <label htmlFor="currency">Mata uang utama</label><div className="select-wrap"><select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="label-row"><label htmlFor="password">Kata sandi</label><span>8+ karakter, huruf & angka</span></div><div className="input-wrap"><LockKeyhole size={18} /><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Buat kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><button type="button" className="reveal-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <label htmlFor="confirm-password">Konfirmasi kata sandi</label><div className="input-wrap"><LockKeyhole size={18} /><input id="confirm-password" type={showConfirmation ? "text" : "password"} autoComplete="new-password" placeholder="Ulangi kata sandi" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /><button type="button" className="reveal-button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Lihat konfirmasi kata sandi"}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="primary-button" disabled={loading}>{loading ? <><span className="auth-spinner" />Membuat akun...</> : <>Buat akun gratis <ArrowRight size={17} /></>}</button>
        </form><p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk</Link></p></div><div className="auth-legal">Dengan mendaftar, kamu menyetujui <a href="#">Ketentuan Layanan</a> dan <a href="#">Kebijakan Privasi</a>.</div></section>
    </main>
  );
}
