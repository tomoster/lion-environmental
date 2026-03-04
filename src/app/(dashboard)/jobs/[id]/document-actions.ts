"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadSignedProposal(
  jobId: string,
  propertyId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file selected" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "pdf";
  const storagePath = `signed-proposals/${jobId}/${propertyId}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from("job_documents").insert({
    job_id: jobId,
    property_id: propertyId,
    document_type: "signed_proposal",
    file_path: storagePath,
    original_filename: file.name,
  });

  if (dbError) return { error: dbError.message };

  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export async function deleteDocument(
  documentId: string,
  jobId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("job_documents")
    .select("file_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document not found" };

  await supabase.storage.from("reports").remove([doc.file_path]);
  const { error } = await supabase
    .from("job_documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  return {};
}
