import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderSignature, type SignatureInfo } from "./signature";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function defaultInvoiceSubject(businessName: string) {
  return `Invoice #{{invoice_number}} from ${businessName}`;
}

function defaultInvoiceBody(businessName: string, zelle: string, checkAddress: string) {
  return `Dear {{company}},

Please find attached your invoice from ${businessName}.

Payment Options:
- Zelle: ${zelle}
- Check payable to: ${businessName}
- Mail to: ${checkAddress}

If you have any questions, please don't hesitate to reach out.

Thank you for your business!`;
}

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
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessZelle?: string;
  businessCheckAddress?: string;
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
  businessName,
  businessPhone,
  businessEmail,
  businessZelle,
  businessCheckAddress,
}: SendInvoiceParams) {
  const bizName = businessName || "Lion Environmental LLC";
  const bizZelle = businessZelle || "2013752797";
  const bizCheckAddr = businessCheckAddress || "1500 Teaneck Rd #448, Teaneck, NJ 07666";

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
    subjectTemplate || defaultInvoiceSubject(bizName),
    vars
  );
  const bodyHtml = textToHtml(
    replaceVars(bodyTemplate || defaultInvoiceBody(bizName, bizZelle, bizCheckAddr), vars)
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
        ${renderSignature({ senderName, businessName: bizName, businessPhone, businessEmail })}
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
      "*, jobs(has_xrf, has_dust_swab, has_asbestos, num_units, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate, client_email)"
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
    num_studios_1bed: number | null;
    xrf_price_studios_1bed: number | null;
    num_2_3bed: number | null;
    xrf_price_2_3bed: number | null;
    num_common_spaces: number | null;
    num_wipes: number | null;
    wipe_rate: number | null;
    dust_swab_site_visit_rate: number | null;
    dust_swab_proj_mgmt_rate: number | null;
    num_asbestos_samples: number | null;
    asbestos_sample_rate: number | null;
    asbestos_site_visit_rate: number | null;
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
  const businessName = settingsMap["business_name"];
  const businessPhone = settingsMap["business_phone"];
  const businessEmail = settingsMap["business_email"];
  const businessZelle = settingsMap["business_zelle"];
  const businessCheckAddress = settingsMap["business_check_address"];

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
      num_studios_1bed: job.num_studios_1bed,
      xrf_price_studios_1bed: job.xrf_price_studios_1bed,
      num_2_3bed: job.num_2_3bed,
      xrf_price_2_3bed: job.xrf_price_2_3bed,
      num_common_spaces: job.num_common_spaces,
      num_wipes: job.num_wipes,
      wipe_rate: job.wipe_rate,
      dust_swab_site_visit_rate: job.dust_swab_site_visit_rate,
      dust_swab_proj_mgmt_rate: job.dust_swab_proj_mgmt_rate,
      num_asbestos_samples: job.num_asbestos_samples,
      asbestos_sample_rate: job.asbestos_sample_rate,
      asbestos_site_visit_rate: job.asbestos_site_visit_rate,
    },
    { businessName, businessAddress: businessCheckAddress, businessPhone, businessEmail, businessZelle, businessCheckAddress }
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
    businessName,
    businessPhone,
    businessEmail,
    businessZelle,
    businessCheckAddress,
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
