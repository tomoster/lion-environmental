import type { InlineKeyboardMarkup } from "./types";

export function acceptJobKeyboard(jobId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "Accept Job", callback_data: `accept_${jobId}` }],
    ],
  };
}

export function completeJobKeyboard(jobId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "Mark Complete", callback_data: `complete_${jobId}` }],
    ],
  };
}

export function sendInvoiceKeyboard(invoiceId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Approve & Send Invoice",
          callback_data: `sendinv_${invoiceId}`,
        },
      ],
    ],
  };
}

export function sendReportKeyboard(jobId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "Approve & Send Report",
          callback_data: `sendreport_${jobId}`,
        },
      ],
    ],
  };
}

export function reportForJobKeyboard(
  jobs: { id: string; jobNumber: number; client: string }[]
): InlineKeyboardMarkup {
  return {
    inline_keyboard: jobs.map((j) => [
      {
        text: `Job #${j.jobNumber} — ${j.client}`,
        callback_data: `reportfor_${j.id}`,
      },
    ]),
  };
}
