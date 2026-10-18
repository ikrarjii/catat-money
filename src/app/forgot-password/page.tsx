"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ArrowLeft, LoaderCircle, Mail, WalletCards } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await getSupabaseBrowser().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Link reset belum dapat dikirim. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell forgot-shell">
      <section className="auth-panel forgot-panel">
        <div className="auth-card forgot-card">
          <Link href="/login" className="mobile-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></Link>
          <div className="forgot-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></div>
          <h1>Lupa kata sandi?</h1>
          <p className="forgot-description">Masukkan email akunmu. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="forgot-email">Alamat email</label>
            <div className="input-wrap"><Mail size={18} /><input id="forgot-email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-notice" role="status">Link untuk mengatur ulang kata sandi telah dikirim ke email kamu. Silakan periksa kotak masuk/spam.</p>}
            <button className="primary-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="spin" />Mengirim link...</> : "Kirim Link Reset Password"}</button>
          </form>
          <Link href="/login" className="forgot-back"><ArrowLeft size={16} />Kembali ke Halaman Login</Link>
        </div>
      </section>
    </main>
  );
}
