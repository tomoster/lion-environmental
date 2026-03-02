"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateInvoiceForJob, generateAndStorePdfForInvoice } from "@/lib/invoices/generate";
import { autoSendReports } from "@/lib/reports/auto-send";

export async function generateInvoice(jobId: string) {
  const supabase = await createClient();
  const { invoiceId } = await generateInvoiceForJob(supabase, jobId);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

async function autoSendReportsForJob(supabase: ReturnType<typeof createAdminClient>, jobId: string) {
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("job_id", jobId);

  for (const prop of properties ?? []) {
    await autoSendReports(supabase, prop.id);
  }
}

export async function markAsPaid(id: string): Promise<void> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("job_id")
    .eq("id", id)
    .single();

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

  if (invoice?.job_id) {
    const adminClient = createAdminClient();
    await autoSendReportsForJob(adminClient, invoice.job_id);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function updateInvoiceStatus(id: string, status: string): Promise<void> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("job_id")
    .eq("id", id)
    .single();

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

  if (status === "paid" && invoice?.job_id) {
    const adminClient = createAdminClient();
    await autoSendReportsForJob(adminClient, invoice.job_id);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function generateAndStorePdf(invoiceId: string): Promise<void> {
  const supabase = await createClient();
  await generateAndStorePdfForInvoice(supabase, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function sendInvoiceToClient(invoiceId: string): Promise<void> {
  const supabase = await createClient();
  const { sendInvoiceForId } = await import("@/lib/email/send-invoice");
  await sendInvoiceForId(invoiceId, supabase);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}
