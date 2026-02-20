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

export function sendReportKeyboard(jobId: string, reportType: "xrf" | "dust_swab"): InlineKeyboardMarkup {
  const prefix = reportType === "xrf" ? "sendreport_xrf_" : "sendreport_ds_";
  const label = reportType === "xrf" ? "Approve & Send XRF Report" : "Approve & Send Dust Swab Report";
  return {
    inline_keyboard: [
      [
        {
          text: label,
          callback_data: `${prefix}${jobId}`,
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

export function reportTypeKeyboard(jobId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "XRF Report", callback_data: `rtype_xrf_${jobId}` },
        { text: "Dust Swab Report", callback_data: `rtype_ds_${jobId}` },
      ],
    ],
  };
}
