"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, WalletCards } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getSupabaseBrowser().auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        setError("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan reset baru.");
      } else {
        setHasRecoverySession(true);
      }
      setCheckingSession(false);
    }).catch(() => {
      if (!active) return;
      setError("Sesi reset tidak dapat diverifikasi. Periksa koneksi atau minta tautan baru.");
      setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError("Kata sandi harus minimal 8 karakter dan memuat huruf serta angka."); return; }
    if (password !== confirmation) { setError("Konfirmasi kata sandi belum cocok."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await getSupabaseBrowser().auth.updateUser({ password });
      if (updateError) throw updateError;
      await getSupabaseBrowser().auth.signOut();
      setNotice("Kata sandi berhasil diperbarui. Silakan masuk kembali.");
      window.setTimeout(() => router.replace("/login"), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(/expired|session|token|otp/i.test(message)
        ? "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan reset baru."
        : message || "Kata sandi belum dapat diperbarui. Coba lagi.");
    } finally { setLoading(false); }
  }

  return <main className="auth-shell forgot-shell"><section className="auth-panel reset-panel"><div className="auth-card forgot-card"><Link href="/login" className="mobile-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></Link><span className="forgot-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></span><h1 className="forgot-title">Buat kata sandi baru</h1><p className="forgot-description">Gunakan minimal 8 karakter, termasuk huruf dan angka.</p>
    {checkingSession ? <div className="settings-loading"><LoaderCircle size={18} className="spin" /> Memverifikasi tautan reset...</div> : !hasRecoverySession ? <><p className="form-error" role="alert">{error || "Tautan reset tidak valid atau sudah kedaluwarsa."}</p><p className="auth-switch"><Link href="/forgot-password">Minta tautan reset baru</Link></p></> : <form onSubmit={handleSubmit} className="auth-form"><label htmlFor="password">Kata sandi baru</label><div className="input-wrap"><LockKeyhole size={18} /><input id="password" type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><button type="button" className="reveal-button" onClick={() => setVisible(!visible)} aria-label={visible ? "Sembunyikan kata sandi" : "Lihat kata sandi"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
      <label htmlFor="confirmation">Konfirmasi kata sandi baru</label><div className="input-wrap"><LockKeyhole size={18} /><input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice} Kamu akan diarahkan ke login dalam 3 detik.</p>}
      <button className="primary-button" disabled={loading || Boolean(notice)}>{loading ? <><LoaderCircle size={17} className="spin" />Menyimpan...</> : <>Simpan kata sandi <ArrowRight size={17} /></>}</button>
    </form>}
    {hasRecoverySession && <p className="auth-switch"><Link href="/login">Kembali ke halaman masuk</Link></p>}</div></section></main>;
}
