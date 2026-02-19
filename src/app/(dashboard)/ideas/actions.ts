"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createIdea(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("ideas").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    created_by: (formData.get("created_by") as string) || "Avi",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ideas");
  return { success: true };
}

export async function deleteIdea(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("ideas").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ideas");
  return { success: true };
}
