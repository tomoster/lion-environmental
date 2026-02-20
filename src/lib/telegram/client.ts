import type { InlineKeyboardMarkup } from "./types";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Telegram sendMessage failed:", await res.text());
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
) {
  const body: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };
  if (text) body.text = text;

  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteMessage(chatId: number | string, messageId: number) {
  const res = await fetch(`${API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });

  if (!res.ok) {
    console.error("Telegram deleteMessage failed:", await res.text());
  }
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${API}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const filePath = data.result?.file_path;
  if (!filePath) return null;

  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

export async function sendDocument(
  chatId: number | string,
  fileUrl: string,
  caption?: string,
  replyMarkup?: InlineKeyboardMarkup
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    document: fileUrl,
    parse_mode: "HTML",
  };
  if (caption) body.caption = caption;
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${API}/sendDocument`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("Telegram sendDocument failed:", await res.text());
  }
}
