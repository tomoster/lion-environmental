import type { SupabaseClient } from "@supabase/supabase-js";

export async function generateInvoiceForJob(
  supabase: SupabaseClient,
  jobId: string
): Promise<{ invoiceId: string; invoiceNumber: number; total: number }> {
  const [{ data: job, error: jobError }, { data: settings }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, has_asbestos, num_units, price_per_unit, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, price_per_common_space, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate"
        )
        .eq("id", jobId)
        .single(),
      supabase.from("settings").select("key, value"),
    ]);

  if (jobError || !job) {
    throw new Error("Job not found");
  }

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  );

  const taxRate = parseFloat(settingsMap["tax_rate"] ?? "8.88");

  let subtotal = 0;

  if (job.has_xrf) {
    subtotal +=
      (job.num_studios_1bed ?? 0) * (job.xrf_price_studios_1bed ?? 0) +
      (job.num_2_3bed ?? 0) * (job.xrf_price_2_3bed ?? 0) +
      (job.num_common_spaces ?? 0) * (job.price_per_common_space ?? 0);
  }

  if (job.has_dust_swab) {
    subtotal +=
      (job.dust_swab_site_visit_rate ?? 0) +
      (job.dust_swab_proj_mgmt_rate ?? 0) +
      (job.num_wipes ?? 0) * (job.wipe_rate ?? 0);
  }

  if (job.has_asbestos) {
    subtotal +=
      (job.asbestos_site_visit_rate ?? 0) +
      (job.num_asbestos_samples ?? 0) * (job.asbestos_sample_rate ?? 0);
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
    .select("id, invoice_number")
    .single();

  if (insertError || !invoice) {
    throw new Error(insertError?.message ?? "Failed to create invoice");
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    total,
  };
}

export async function generateAndStorePdfForInvoice(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<void> {
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "*, jobs(has_xrf, has_dust_swab, has_asbestos, num_units, price_per_unit, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, price_per_common_space, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate)"
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
    num_studios_1bed: number | null;
    xrf_price_studios_1bed: number | null;
    num_2_3bed: number | null;
    xrf_price_2_3bed: number | null;
    num_common_spaces: number | null;
    price_per_common_space: number | null;
    num_wipes: number | null;
    wipe_rate: number | null;
    dust_swab_site_visit_rate: number | null;
    dust_swab_proj_mgmt_rate: number | null;
    num_asbestos_samples: number | null;
    asbestos_sample_rate: number | null;
    asbestos_site_visit_rate: number | null;
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
      has_xrf: job?.has_xrf ?? false,
      has_dust_swab: job?.has_dust_swab ?? false,
      has_asbestos: job?.has_asbestos ?? false,
      num_units: job?.num_units ?? null,
      price_per_unit: job?.price_per_unit ?? null,
      num_studios_1bed: job?.num_studios_1bed ?? null,
      xrf_price_studios_1bed: job?.xrf_price_studios_1bed ?? null,
      num_2_3bed: job?.num_2_3bed ?? null,
      xrf_price_2_3bed: job?.xrf_price_2_3bed ?? null,
      num_common_spaces: job?.num_common_spaces ?? null,
      price_per_common_space: job?.price_per_common_space ?? null,
      num_wipes: job?.num_wipes ?? null,
      wipe_rate: job?.wipe_rate ?? null,
      dust_swab_site_visit_rate: job?.dust_swab_site_visit_rate ?? null,
      dust_swab_proj_mgmt_rate: job?.dust_swab_proj_mgmt_rate ?? null,
      num_asbestos_samples: job?.num_asbestos_samples ?? null,
      asbestos_sample_rate: job?.asbestos_sample_rate ?? null,
      asbestos_site_visit_rate: job?.asbestos_site_visit_rate ?? null,
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
}
