import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "../lib/supabase-admin";

export async function createAccountLink(user: { id: string; email: string }) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  if (!botUsername) throw new Error("TELEGRAM_BOT_USERNAME is not configured");

  const ttlMinutes = Number(process.env.TELEGRAM_LINK_TOKEN_TTL_MINUTES ?? "10");
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 60) {
    throw new Error("TELEGRAM_LINK_TOKEN_TTL_MINUTES must be between 1 and 60");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { error } = await getSupabaseAdmin().from("users").upsert(
    { id: user.id, email: user.email, link_token: token, link_token_expires_at: expiresAt } as never,
    { onConflict: "id" },
  );
  if (error) throw new Error(`Could not create account link: ${error.message}`);

  const deepLink = `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
  return { token, expiresAt, deepLink };
}
