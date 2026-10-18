import { Bot } from "grammy";
import { parseTransactionText } from "./transaction-parser";
import { getSupabaseAdmin } from "../lib/supabase-admin";
import { DEFAULT_CATEGORIES } from "../lib/categories";

let botInstance: Bot | undefined;

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(amount);
}

function makassarMonth(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Makassar", year: "numeric", month: "2-digit",
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function monthUtcBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const makassarOffset = 8 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1) - makassarOffset).toISOString(),
    end: new Date(Date.UTC(year, monthNumber, 1) - makassarOffset).toISOString(),
  };
}

async function getBudgetAlert(userId: string, categoryName: string, transactionDate: string) {
  const month = makassarMonth(transactionDate);
  const admin = getSupabaseAdmin();
  const { data: budget, error: budgetError } = await admin.from("budgets")
    .select("amount_limit")
    .eq("user_id", userId)
    .eq("category_name", categoryName)
    .eq("month", month)
    .maybeSingle();
  if (budgetError) throw budgetError;
  if (!budget) return null;

  const { start, end } = monthUtcBounds(month);
  let spent = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "EXPENSE")
      .eq("category", categoryName)
      .gte("date", start)
      .lt("date", end)
      .range(from, from + 999);
    if (error) throw error;
    spent += ((data ?? []) as Array<{ amount: number }>).reduce((sum, row) => sum + Number(row.amount), 0);
    if (!data || data.length < 1000) break;
  }

  const limit = Number(budget.amount_limit);
  const percentage = Math.floor((spent / limit) * 100);
  if (percentage >= 100) {
    const overBy = Math.max(0, spent - limit);
    return `🚨 Anggaran Terlampaui! Kamu telah menggunakan ${percentage}% anggaran ${categoryName} bulan ini. Batas ${formatRupiah(limit)} terlampaui sebesar ${formatRupiah(overBy)} (total ${formatRupiah(spent)}).`;
  }
  if (percentage >= 80) {
    return `⚠️ Peringatan Anggaran: Pengeluaran ${categoryName} kamu bulan ini sudah mencapai ${percentage}% (${formatRupiah(spent)} / ${formatRupiah(limit)}).`;
  }
  return null;
}

export function getTelegramBot() {
  if (botInstance) return botInstance;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const linkToken = ctx.match.trim().split(/\s+/)[0];
    if (!linkToken) {
      await ctx.reply("Hai! Untuk menghubungkan akun, buat link Telegram dari Web Dashboard lalu buka link tersebut.");
      return;
    }

    const now = new Date().toISOString();
    const { data: linkedUser, error } = await getSupabaseAdmin()
      .from("users")
      .update({ telegram_chat_id: String(ctx.chat.id), link_token: null, link_token_expires_at: null } as never)
      .eq("link_token", linkToken)
      .gt("link_token_expires_at", now)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Telegram account linking failed", error);
      await ctx.reply("Link belum dapat diproses. Silakan coba lagi beberapa saat lagi.");
    } else if (!linkedUser) {
      await ctx.reply("Link tidak valid atau sudah kedaluwarsa. Buat link baru dari Web Dashboard.");
    } else {
      await ctx.reply("Akun berhasil terhubung dengan Web Dashboard!");
    }
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;
    const chatId = String(ctx.chat.id);
    const { data: userData, error: lookupError } = await getSupabaseAdmin()
      .from("users")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (lookupError) {
      console.error("Telegram account lookup failed", lookupError);
      await ctx.reply("Akun belum dapat diperiksa. Silakan coba lagi sebentar lagi.");
      return;
    }
    const user = userData as { id: string } | null;
    if (!user) {
      await ctx.reply("Akun Anda belum terhubung. Silakan login ke Web Dashboard dan hubungkan Telegram terlebih dahulu.");
      return;
    }

    try {
      const { data: customCategories, error: categoryError } = await getSupabaseAdmin()
        .from("categories").select("name,type").eq("user_id", user.id);
      if (categoryError) console.error("Telegram category lookup failed", categoryError);
      const categories = [
        ...DEFAULT_CATEGORIES.map(({ name, type }) => ({ name, type })),
        ...((customCategories ?? []) as Array<{ name: string; type: "INCOME" | "EXPENSE" }>),
      ];
      const transaction = await parseTransactionText(ctx.message.text, { categories });
      if (transaction.amount <= 0) {
        await ctx.reply("Saya belum menemukan nominalnya. Coba kirim ulang dengan jumlah yang jelas, misalnya: Beli makan 25rb.");
        return;
      }

      const supabase = getSupabaseAdmin();
      const transactionRow = {
        user_id: user.id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        date: transaction.date,
      };
      let { error: insertError } = await supabase.from("transactions").insert({ ...transactionRow, source: "TELEGRAM" } as never);
      // Preserve Telegram recording while an existing database is waiting for the source migration.
      if (insertError && /source.*(schema cache|column|does not exist)|column.*source/i.test(insertError.message)) {
        ({ error: insertError } = await supabase.from("transactions").insert(transactionRow as never));
      }
      if (insertError) throw insertError;

      const typeLabel = transaction.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
      await ctx.reply([
        "Transaksi tercatat",
        `Jenis: ${typeLabel}`,
        `Nominal: ${formatRupiah(transaction.amount)}`,
        `Kategori: ${transaction.category}`,
        `Deskripsi: ${transaction.description || "-"}`,
        `Tanggal: ${transaction.date}`,
      ].join("\n"));

      if (transaction.type === "EXPENSE") {
        try {
          const alert = await getBudgetAlert(user.id, transaction.category, transaction.date);
          if (alert) await ctx.reply(alert);
        } catch (budgetError) {
          // Do not report the saved transaction as failed if budget lookup is unavailable.
          console.error("Telegram budget alert lookup failed", budgetError);
        }
      }
    } catch (error) {
      console.error("Telegram transaction handling failed", error);
      await ctx.reply("Pesan belum dapat diproses saat ini. Coba kirim ulang dalam bentuk yang lebih jelas.");
    }
  });

  bot.catch((error) => console.error("Telegram bot error", error));
  botInstance = bot;
  return bot;
}
