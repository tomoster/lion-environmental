"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWorker(formData: FormData) {
  const supabase = await createClient();

  const ratePerUnit = formData.get("rate_per_unit") as string;
  const ratePerCommon = formData.get("rate_per_common_space") as string;

  const { error } = await supabase.from("workers").insert({
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    role: (formData.get("role") as string) || "inspector",
    rate_per_unit: ratePerUnit ? parseFloat(ratePerUnit) : null,
    rate_per_common_space: ratePerCommon ? parseFloat(ratePerCommon) : null,
    active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workers");
  return { success: true };
}

export async function updateWorker(id: string, formData: FormData) {
  const supabase = await createClient();

  const ratePerUnit = formData.get("rate_per_unit") as string;
  const ratePerCommon = formData.get("rate_per_common_space") as string;

  const { error } = await supabase
    .from("workers")
    .update({
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      role: (formData.get("role") as string) || "inspector",
      rate_per_unit: ratePerUnit ? parseFloat(ratePerUnit) : null,
      rate_per_common_space: ratePerCommon ? parseFloat(ratePerCommon) : null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workers");
  revalidatePath(`/workers/${id}`);
  return { success: true };
}

export async function toggleWorkerActive(id: string) {
  const supabase = await createClient();

  const { data: worker, error: fetchError } = await supabase
    .from("workers")
    .select("active")
    .eq("id", id)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const { error } = await supabase
    .from("workers")
    .update({ active: !worker.active })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workers");
  revalidatePath(`/workers/${id}`);
  return { success: true };
}

export async function deleteWorker(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("workers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/workers");
  return { success: true };
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient();

  const jobIdRaw = formData.get("job_id") as string;

  const { error } = await supabase.from("worker_payments").insert({
    worker_id: formData.get("worker_id") as string,
    job_id: jobIdRaw && jobIdRaw !== "none" ? jobIdRaw : null,
    amount: parseFloat(formData.get("amount") as string),
    payment_date: formData.get("payment_date") as string,
    confirmation_number: (formData.get("confirmation_number") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) {
    return { error: error.message };
  }

  const workerId = formData.get("worker_id") as string;
  revalidatePath(`/workers/${workerId}`);
  return { success: true };
}

export async function deletePayment(id: string, workerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("worker_payments")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/workers/${workerId}`);
  return { success: true };
}
