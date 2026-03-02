"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nextBusinessDaySend } from "@/lib/email/scheduling";

export async function createProspect(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("prospects").insert({
    company: formData.get("company") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    building_address: (formData.get("building_address") as string) || null,
    status: (formData.get("status") as string) || "new",
    next_followup: (formData.get("next_followup") as string) || null,
    source: "manual",
    notes: (formData.get("notes") as string) || null,
    seq_step: 0,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function updateProspect(id: string, formData: FormData) {
  const supabase = await createClient();

  const newStatus = (formData.get("status") as string) || "new";

  const updates: Record<string, unknown> = {
    company: formData.get("company") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    building_address: (formData.get("building_address") as string) || null,
    status: newStatus,
    next_followup: (formData.get("next_followup") as string) || null,
    notes: (formData.get("notes") as string) || null,
    updated_at: new Date().toISOString(),
  };

  if (newStatus !== "emailing") {
    updates.next_send = null;
  }

  const { error } = await supabase
    .from("prospects")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("prospects").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function startEmailSequence(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({
      status: "emailing",
      seq_step: 1,
      next_send: nextBusinessDaySend(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function getEmailLog(prospectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_log")
    .select("id, step, subject, status, error, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (error) return { logs: [] as Array<{ id: string; step: number; subject: string; status: string; error: string | null; created_at: string }> };
  return { logs: data ?? [] };
}

export async function pauseEmailSequence(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({ next_send: null })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function resumeEmailSequence(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({ next_send: nextBusinessDaySend() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}
