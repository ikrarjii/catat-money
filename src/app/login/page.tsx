"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, WalletCards } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    try {
      const client = getSupabaseBrowser(rememberMe);
      const { error: authError } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (authError) throw authError;
      document.cookie = rememberMe
        ? `cm-remember=1; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`
        : "cm-remember=; Max-Age=0; Path=/; SameSite=Lax";
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      let destination = "/dashboard";
      if (requestedNext) {
        const candidate = new URL(requestedNext, window.location.origin);
        if (candidate.origin === window.location.origin && (candidate.pathname === "/dashboard" || candidate.pathname.startsWith("/dashboard/"))) {
          destination = `${candidate.pathname}${candidate.search}${candidate.hash}`;
        }
      }
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa email dan kata sandi.");
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story login-story">
        <Link href="/" className="brand"><span className="brand-mark"><WalletCards size={21} /></span>catat<span className="brand-light">money</span></Link>
        <div className="story-copy"><h1>Keuangan jelas.<br /><em>Hidup lebih tenang.</em></h1><p>Catat pemasukan dan pengeluaran semudah mengirim pesan.</p></div>
      </section>
      <section className="auth-panel login-panel"><div className="auth-card login-card"><div className="mobile-brand"><span className="brand-mark"><WalletCards size={20} /></span>catat<span className="brand-light">money</span></div><h2>Masuk ke akunmu</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Alamat email</label><div className="input-wrap"><Mail size={18} /><input id="email" type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div className="label-row"><label htmlFor="password">Kata sandi</label><Link className="inline-link" href="/forgot-password">Lupa kata sandi?</Link></div>
          <div className="input-wrap"><LockKeyhole size={18} /><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /><button type="button" className="reveal-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Ingat saya selama 30 hari</label>
          {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="primary-button" disabled={loading}>{loading ? <><span className="auth-spinner" />Memproses...</> : <>Masuk ke dashboard <ArrowRight size={17} /></>}</button>
        </form><p className="auth-switch">Belum punya akun? <Link href="/register">Daftar gratis</Link></p>
      </div></section>
    </main>
  );
}
