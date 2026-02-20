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
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/prospects");
  return { success: true };
}

export async function updateProspect(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({
      company: formData.get("company") as string,
      contact_name: (formData.get("contact_name") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      building_address: (formData.get("building_address") as string) || null,
      status: (formData.get("status") as string) || "new",
      next_followup: (formData.get("next_followup") as string) || null,
      source: (formData.get("source") as string) || "manual",
      notes: (formData.get("notes") as string) || null,
      updated_at: new Date().toISOString(),
    })
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
