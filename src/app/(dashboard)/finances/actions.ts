"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createExpense(formData: FormData) {
  const supabase = await createClient();

  const jobIdRaw = formData.get("job_id") as string;

  const { error } = await supabase.from("expenses").insert({
    amount: parseFloat(formData.get("amount") as string),
    date: formData.get("date") as string,
    category: formData.get("category") as string,
    description: (formData.get("description") as string) || null,
    job_id: jobIdRaw && jobIdRaw !== "none" ? jobIdRaw : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/finances");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/finances");
  return { success: true };
}
