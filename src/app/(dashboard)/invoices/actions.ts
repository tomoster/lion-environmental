"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateInvoiceForJob, generateAndStorePdfForInvoice } from "@/lib/invoices/generate";

export async function generateInvoice(jobId: string) {
  const supabase = await createClient();
  const { invoiceId } = await generateInvoiceForJob(supabase, jobId);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
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
