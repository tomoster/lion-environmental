import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const DEFAULT_INVOICE_SUBJECT =
  "Invoice #{{invoice_number}} from Lion Environmental LLC";

const DEFAULT_INVOICE_BODY = `Dear {{company}},

Please find attached your invoice from Lion Environmental LLC.

Payment Options:
- Zelle: 2013752797
- Check payable to: Lion Environmental LLC
- Mail to: 1500 Teaneck Rd #448, Teaneck, NJ 07666

If you have any questions, please don't hesitate to reach out.

Thank you for your business!`;

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => l.trimStart().startsWith("- "))) {
        const items = lines
          .map((l) => `<li>${l.replace(/^\s*-\s*/, "")}</li>`)
          .join("");
        return `<ul style="color: #555;">${items}</ul>`;
      }
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

type SendInvoiceParams = {
  to: string;
  invoiceNumber: number;
  clientCompany: string;
  total: number;
  dueDate: string;
  pdfBuffer: Buffer;
  senderName: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
};

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  clientCompany,
  total,
  dueDate,
  pdfBuffer,
  senderName,
  subjectTemplate,
  bodyTemplate,
}: SendInvoiceParams) {
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);

  const formattedDue = new Date(dueDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  const vars: Record<string, string> = {
    invoice_number: String(invoiceNumber),
    company: clientCompany,
    amount: formattedTotal,
    due_date: formattedDue,
  };

  const subject = replaceVars(
    subjectTemplate || DEFAULT_INVOICE_SUBJECT,
    vars
  );
  const bodyHtml = textToHtml(
    replaceVars(bodyTemplate || DEFAULT_INVOICE_BODY, vars)
  );

  const info = await transporter.sendMail({
    from: `${senderName} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invoice #${invoiceNumber}</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
            <td style="padding: 8px 0; font-weight: bold;">#${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount Due:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formattedTotal}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Due Date:</td>
            <td style="padding: 8px 0; font-weight: bold;">${formattedDue}</td>
          </tr>
        </table>
        ${bodyHtml}
        <p style="color: #666; margin-top: 20px;">
          Best regards,<br/>
          ${senderName}<br/>
          Lion Environmental LLC<br/>
          (201) 375-2797<br/>
          lionenvironmentalllc@gmail.com
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  return { id: info.messageId };
}

export async function sendInvoiceForId(
  invoiceId: string,
  supabase: SupabaseClient
): Promise<{ invoiceNumber: number; sentTo: string }> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "*, jobs(has_xrf, has_dust_swab, has_asbestos, num_units, price_per_unit, num_common_spaces, price_per_common_space, num_wipes, client_email)"
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  const job = invoice.jobs as {
    has_xrf: boolean;
    has_dust_swab: boolean;
    has_asbestos: boolean;
    num_units: number | null;
    price_per_unit: number | null;
    num_common_spaces: number | null;
    price_per_common_space: number | null;
    num_wipes: number | null;
    client_email: string | null;
  } | null;

  if (!job?.client_email) {
    throw new Error("No client email address on file for this job");
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("key, value");
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  );
  const senderName = settingsMap["sender_name"] ?? "Avi Bursztyn";

  const { renderInvoiceToBuffer } = await import("@/lib/pdf/invoice-template");

  const pdfBuffer = await renderInvoiceToBuffer(
    {
      invoice_number: invoice.invoice_number,
      client_company: invoice.client_company,
      building_address: invoice.building_address,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      total: invoice.total,
      date_sent: invoice.date_sent,
      due_date: invoice.due_date,
      created_at: invoice.created_at,
    },
    {
      has_xrf: job.has_xrf,
      has_dust_swab: job.has_dust_swab,
      has_asbestos: job.has_asbestos,
      num_units: job.num_units,
      price_per_unit: job.price_per_unit,
      num_common_spaces: job.num_common_spaces,
      price_per_common_space: job.price_per_common_space,
      num_wipes: job.num_wipes,
    }
  );

  await sendInvoiceEmail({
    to: job.client_email,
    invoiceNumber: invoice.invoice_number,
    clientCompany: invoice.client_company ?? "Client",
    total: invoice.total ?? 0,
    dueDate: invoice.due_date ?? "",
    pdfBuffer: Buffer.from(pdfBuffer),
    senderName,
    subjectTemplate: settingsMap["invoice_email_subject"],
    bodyTemplate: settingsMap["invoice_email_body"],
  });

  const pdfPath = `invoices/${invoiceId}/invoice-${invoice.invoice_number}.pdf`;
  await supabase.storage
    .from("invoices")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  await supabase
    .from("invoices")
    .update({
      status: "sent",
      date_sent: new Date().toISOString(),
      pdf_path: pdfPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  return { invoiceNumber: invoice.invoice_number, sentTo: job.client_email };
}
