"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createWorker(formData: FormData) {
  const supabase = await createClient();

  const ratePerUnitRaw = formData.get("rate_per_unit") as string;
  const ratePerCommonSpaceRaw = formData.get("rate_per_common_space") as string;

  const { error } = await supabase.from("workers").insert({
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    zelle: (formData.get("zelle") as string) || null,
    specialization: (formData.get("specialization") as string) || null,
    rate_per_unit: ratePerUnitRaw ? parseFloat(ratePerUnitRaw) : null,
    rate_per_common_space: ratePerCommonSpaceRaw ? parseFloat(ratePerCommonSpaceRaw) : null,
    role: (formData.get("role") as string) || "field",
    telegram_chat_id: (formData.get("telegram_chat_id") as string) || null,
    active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/team");
  return { success: true };
}

export async function updateWorker(id: string, formData: FormData) {
  const supabase = await createClient();

  const ratePerUnitRaw = formData.get("rate_per_unit") as string;
  const ratePerCommonSpaceRaw = formData.get("rate_per_common_space") as string;

  const { error } = await supabase
    .from("workers")
    .update({
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      zelle: (formData.get("zelle") as string) || null,
      specialization: (formData.get("specialization") as string) || null,
      rate_per_unit: ratePerUnitRaw ? parseFloat(ratePerUnitRaw) : null,
      rate_per_common_space: ratePerCommonSpaceRaw ? parseFloat(ratePerCommonSpaceRaw) : null,
      role: (formData.get("role") as string) || "field",
      telegram_chat_id: (formData.get("telegram_chat_id") as string) || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/team");
  revalidatePath(`/team/${id}`);
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

  revalidatePath("/team");
  revalidatePath(`/team/${id}`);
  return { success: true };
}

export async function deleteWorker(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("workers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/team");
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
  revalidatePath(`/team/${workerId}`);
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

  revalidatePath(`/team/${workerId}`);
  return { success: true };
}

export async function addRecurringBlock(workerId: string, dayOfWeek: number) {
  const supabase = await createClient();

  const { error } = await supabase.from("worker_availability").insert({
    worker_id: workerId,
    type: "recurring",
    day_of_week: dayOfWeek,
    all_day: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/team/${workerId}`);
  return { success: true };
}

export async function addOneOffBlock(workerId: string, date: string, reason?: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("worker_availability").insert({
    worker_id: workerId,
    type: "one_off",
    specific_date: date,
    all_day: true,
    reason: reason || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/team/${workerId}`);
  return { success: true };
}

export async function removeAvailabilityBlock(id: string, workerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("worker_availability")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/team/${workerId}`);
  return { success: true };
}
