import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { parseTransactionMessage } from "../../../../services/transaction-parser";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!token) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Konfigurasi Supabase belum lengkap." }, { status: 500 });

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (typeof body?.message !== "string" || !body.message.trim() || body.message.length > 1000) {
    return NextResponse.json({ error: "Field 'message' wajib diisi (maksimal 1000 karakter)." }, { status: 400 });
  }
  const { data: withinLimit, error: rateLimitError } = await getSupabaseAdmin()
    .rpc("consume_parse_rate_limit", { p_user_id: user.id, p_limit: 10, p_window_seconds: 60 } as never);
  if (rateLimitError) {
    console.error("Transaction parser rate limit unavailable", rateLimitError);
    return NextResponse.json({ error: "Layanan parser sementara tidak tersedia." }, { status: 503 });
  }
  if (!withinLimit) {
    return NextResponse.json({ error: "Batas penggunaan tercapai. Coba lagi dalam satu menit." }, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
  try {
    return NextResponse.json(await parseTransactionMessage(body.message));
  } catch (error) {
    console.error("Transaction parsing failed", error);
    return NextResponse.json({ error: "Pesan belum dapat diproses." }, { status: 502 });
  }
}
