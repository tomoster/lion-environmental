"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    source: (formData.get("source") as string) || "manual",
    notes: (formData.get("notes") as string) || null,
    seq_status: "not_started",
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
    source: (formData.get("source") as string) || "manual",
    notes: (formData.get("notes") as string) || null,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === "lost" || newStatus === "archived") {
    updates.seq_status = "paused";
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

  const nextSend = new Date();
  nextSend.setDate(nextSend.getDate() + 1);
  nextSend.setUTCHours(14, Math.floor(Math.random() * 60), 0, 0);
  const day = nextSend.getUTCDay();
  if (day === 6) nextSend.setDate(nextSend.getDate() + 2);
  if (day === 0) nextSend.setDate(nextSend.getDate() + 1);

  const { error } = await supabase
    .from("prospects")
    .update({
      seq_status: "active",
      seq_step: 1,
      next_send: nextSend.toISOString(),
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
    .update({
      seq_status: "paused",
      next_send: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}
