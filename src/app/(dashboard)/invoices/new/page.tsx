import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateInvoice } from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ job_id?: string }>;
};

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const { job_id } = await searchParams;

  if (!job_id) {
    redirect("/jobs");
  }

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .single();

  if (!job) {
    redirect("/jobs");
  }

  await generateInvoice(job_id);

  return null;
}
