import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { handleStart } from "@/lib/telegram/handlers/start";
import { handleTextMessage } from "@/lib/telegram/handlers/text-message";
import { handleAcceptJob } from "@/lib/telegram/handlers/accept-job";
import { handleCompleteJob } from "@/lib/telegram/handlers/complete-job";
import { handleDocumentUpload } from "@/lib/telegram/handlers/document-upload";
import { handleReportForJob } from "@/lib/telegram/handlers/report-for-job";
import { handleReportTypePick } from "@/lib/telegram/handlers/report-type-pick";
import { handleSendInvoice } from "@/lib/telegram/handlers/send-invoice";
import { handleSendReport } from "@/lib/telegram/handlers/send-report";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();

    if (update.callback_query?.data) {
      const data = update.callback_query.data;

      if (data.startsWith("accept_")) {
        await handleAcceptJob(update.callback_query);
      } else if (data.startsWith("complete_")) {
        await handleCompleteJob(update.callback_query);
      } else if (data.startsWith("sendinv_")) {
        await handleSendInvoice(update.callback_query);
      } else if (data.startsWith("sendreport_")) {
        await handleSendReport(update.callback_query);
      } else if (data.startsWith("reportfor_")) {
        await handleReportForJob(update.callback_query);
      } else if (data.startsWith("rtype_")) {
        await handleReportTypePick(update.callback_query);
      }
    } else if (update.message?.document) {
      await handleDocumentUpload(update.message);
    } else if (update.message?.text === "/start") {
      await handleStart(update.message);
    } else if (update.message?.text) {
      await handleTextMessage(update.message);
    }
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}
