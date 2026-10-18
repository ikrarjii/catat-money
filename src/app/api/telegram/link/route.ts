import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAccountLink } from "../../../../services/account-link";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Konfigurasi Supabase belum lengkap." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user?.email) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  try {
    return NextResponse.json(await createAccountLink({ id: user.id, email: user.email }));
  } catch (linkError) {
    console.error("Telegram link creation failed", linkError);
    return NextResponse.json({ error: "Link Telegram belum dapat dibuat." }, { status: 500 });
  }
}
