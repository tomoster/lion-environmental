import type { InlineKeyboardMarkup } from "./types";

export function acceptPropertyKeyboard(propertyId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "Accept Job", callback_data: `accept_${propertyId}` }],
    ],
  };
}

export function acceptJobKeyboard(jobId: string): InlineKeyboardMarkup {
  return acceptPropertyKeyboard(jobId);
}

export function completePropertyKeyboard(propertyId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "Mark Complete", callback_data: `complete_${propertyId}` }],
    ],
  };
}

export function completeJobKeyboard(jobId: string): InlineKeyboardMarkup {
  return completePropertyKeyboard(jobId);
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

export function reportForPropertyKeyboard(
  properties: { id: string; jobNumber: number; address: string; client: string }[]
): InlineKeyboardMarkup {
  return {
    inline_keyboard: properties.map((p) => [
      {
        text: `#${p.jobNumber} — ${p.address || p.client}`,
        callback_data: `reportfor_${p.id}`,
      },
    ]),
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

export function reportTypeKeyboard(propertyId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "XRF Report", callback_data: `rtype_xrf_${propertyId}` },
        { text: "Dust Swab Report", callback_data: `rtype_ds_${propertyId}` },
      ],
    ],
  };
}
