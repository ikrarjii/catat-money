import { NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getTelegramBot } from "../../../../services/telegram-bot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }
  if (request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const handler = webhookCallback(getTelegramBot(), "std/http");
    return await handler(request);
  } catch (error) {
    console.error("Telegram webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
