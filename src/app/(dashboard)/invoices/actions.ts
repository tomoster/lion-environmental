"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasLpt, hasDustSwab } from "@/lib/service-type-utils";

export async function generateInvoice(jobId: string) {
  const supabase = await createClient();

  const [{ data: job, error: jobError }, { data: settings }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, job_number, client_company, client_email, building_address, service_type, num_units, price_per_unit, num_common_spaces, price_per_common_space, num_wipes"
        )
        .eq("id", jobId)
        .single(),
      supabase.from("settings").select("key, value"),
    ]);

  if (jobError || !job) {
    throw new Error("Job not found");
  }

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, s.value])
  );

  const taxRate = parseFloat(settingsMap["tax_rate"] ?? "8.88");

  let subtotal = 0;

  if (hasLpt(job.service_type)) {
    subtotal +=
      (job.num_units ?? 0) * (job.price_per_unit ?? 0) +
      (job.num_common_spaces ?? 0) * (job.price_per_common_space ?? 0);
  }

  if (hasDustSwab(job.service_type)) {
    const siteVisit = parseFloat(
      settingsMap["dust_swab_site_visit"] ?? "375"
    );
    const reportFee = parseFloat(
      settingsMap["dust_swab_report"] ?? "135"
    );
    const wipeRate = parseFloat(
      settingsMap["dust_swab_wipe_rate"] ?? "20"
    );
    subtotal += siteVisit + reportFee + (job.num_wipes ?? 0) * wipeRate;
  }

  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      job_id: jobId,
      client_company: job.client_company,
      building_address: job.building_address,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: "draft",
      due_date: dueDateStr,
    })
    .select("id")
    .single();

  if (insertError || !invoice) {
    throw new Error(insertError?.message ?? "Failed to create invoice");
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function markAsPaid(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      date_paid: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function updateInvoiceStatus(id: string, status: string): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "sent") {
    updateData.date_sent = new Date().toISOString();
  }

  if (status === "paid") {
    updateData.date_paid = new Date().toISOString();
  }

  const { error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function generateAndStorePdf(invoiceId: string): Promise<void> {
  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*, jobs(service_type, num_units, price_per_unit, num_common_spaces, price_per_common_space, num_wipes)")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  const job = invoice.jobs as {
    service_type: string | null;
    num_units: number | null;
    price_per_unit: number | null;
    num_common_spaces: number | null;
    price_per_common_space: number | null;
    num_wipes: number | null;
  } | null;

  const { renderInvoiceToBuffer } = await import("@/lib/pdf/invoice-template");

  const buffer = await renderInvoiceToBuffer(
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
      service_type: job?.service_type ?? null,
      num_units: job?.num_units ?? null,
      price_per_unit: job?.price_per_unit ?? null,
      num_common_spaces: job?.num_common_spaces ?? null,
      price_per_common_space: job?.price_per_common_space ?? null,
      num_wipes: job?.num_wipes ?? null,
    }
  );

  const path = `invoices/${invoiceId}/invoice-${invoice.invoice_number}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ pdf_path: path, updated_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function sendInvoiceToClient(invoiceId: string): Promise<void> {
  const supabase = await createClient();
  const { sendInvoiceForId } = await import("@/lib/email/send-invoice");
  await sendInvoiceForId(invoiceId, supabase);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}
