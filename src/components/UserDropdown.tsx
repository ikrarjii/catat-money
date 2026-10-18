"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FolderCog, LogOut, Settings, UserRound } from "lucide-react";
import { getSupabaseBrowser } from "../lib/supabase-browser";

type UserDropdownProps = {
  fullName: string;
  email: string;
  onManageCategories: () => void;
};

export default function UserDropdown({ fullName, email, onManageCategories }: UserDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState("");
  const initials = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || email.slice(0, 1).toUpperCase() || "U";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await getSupabaseBrowser().auth.signOut();
      if (error) throw error;
      document.cookie = `cm-remember=; Max-Age=0; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      router.replace("/login");
      router.refresh();
    } catch {
      setActionError("Belum dapat keluar. Coba lagi.");
      setSigningOut(false);
    }
  }

  return (
    <div className="relative flex-none" ref={dropdownRef}>
      <button
        className={`flex items-center gap-2 rounded-xl border border-transparent p-1.5 text-left transition duration-200 hover:border-slate-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${open ? "border-slate-200 bg-white shadow-sm" : ""}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{initials}</span>
        <span className="hidden max-w-44 min-w-0 sm:grid"><strong className="truncate text-xs font-bold text-slate-700">{fullName || "Pengguna Catat Money"}</strong><small className="truncate text-[11px] text-slate-500">{email || ""}</small></span>
        <ChevronDown size={16} className={`hidden flex-none text-slate-500 transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`invisible absolute right-0 top-full z-[55] mt-2 w-[290px] origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl transition duration-200 ease-out sm:w-[310px] max-sm:fixed max-sm:right-2 max-sm:top-[59px] max-sm:mt-0 max-sm:w-[calc(100vw-1rem)] ${open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[.98] opacity-0"}`} role="menu" aria-hidden={!open}>
        <div className="flex items-center gap-3 px-2 py-2.5">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{initials}</span>
          <span className="grid min-w-0 gap-1"><strong className="truncate text-sm font-semibold text-slate-800">{fullName || "Pengguna Catat Money"}</strong><small className="truncate text-xs text-slate-500">{email}</small></span>
        </div>
        <div className="my-1 h-px bg-slate-100" />
        <Link href="/dashboard/settings" className="flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800" role="menuitem" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
          <Settings size={17} className="text-slate-500" /><span>Pengaturan profil</span>
        </Link>
        <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800" type="button" role="menuitem" tabIndex={open ? 0 : -1} onClick={() => { setOpen(false); onManageCategories(); }}>
          <FolderCog size={17} className="text-slate-500" /><span>Kelola kategori</span>
        </button>
        <div className="my-1 h-px bg-slate-100" />
        {actionError && <p className="mx-2 my-1.5 text-xs text-rose-700" role="alert">{actionError}</p>}
        <button className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13px] text-rose-700 transition-colors hover:bg-rose-50 hover:text-rose-800 disabled:cursor-wait disabled:opacity-60" type="button" role="menuitem" tabIndex={open ? 0 : -1} disabled={signingOut} onClick={() => void signOut()}>
          {signingOut ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-rose-700" /> : <LogOut size={17} />}<span>{signingOut ? "Keluar..." : "Keluar"}</span>
        </button>
        <span className="flex items-center gap-1.5 px-2.5 pb-1 pt-2 text-[10px] text-slate-400"><UserRound size={13} /> Akun Catat Money</span>
      </div>
    </div>
  );
}
