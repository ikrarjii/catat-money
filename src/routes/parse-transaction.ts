import { parseTransactionMessage } from "../services/transaction-parser";

// Mount with: app.post("/api/transactions/parse", parseTransactionRoute)
type ExpressRequest = { body?: { message?: unknown } };
type ExpressResponse = { status(code: number): ExpressResponse; json(body: unknown): unknown };

export async function parseTransactionRoute(req: ExpressRequest, res: ExpressResponse) {
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Field 'message' wajib diisi." });
  }
  try {
    return res.json(await parseTransactionMessage(message));
  } catch (error) {
    console.error("Transaction parsing failed", error);
    return res.status(502).json({ error: "Pesan belum dapat diproses." });
  }
}
