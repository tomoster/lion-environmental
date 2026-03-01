"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateProposals } from "@/lib/proposals/generate";
import { sendProposalEmail } from "@/lib/email/send-proposal";

export async function sendProposal(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_company, client_email, building_address, has_xrf, has_dust_swab, has_asbestos, num_units, price_per_unit, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, price_per_common_space, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate")
    .eq("id", jobId)
    .single();

  if (!job) return { error: "Job not found" };
  if (!job.client_email) return { error: "No client email set" };
  if (!job.has_xrf && !job.has_dust_swab && !job.has_asbestos) return { error: "No service types selected" };

  try {
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["sender_name", "proposal_email_subject", "proposal_email_body", "tax_rate"]);

    const s: Record<string, string> = Object.fromEntries(
      (settingsRows ?? []).map(({ key, value }) => [key, value])
    );

    const taxRate = s.tax_rate ? parseFloat(s.tax_rate) / 100 : 0.0888;

    const proposals = await generateProposals(job, taxRate);
    if (proposals.length === 0) return { error: "No proposals generated" };

    await sendProposalEmail({
      to: job.client_email,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "",
      buildingAddress: job.building_address ?? "",
      attachments: proposals,
      senderName: s.sender_name ?? "Lion Environmental",
      subjectTemplate: s.proposal_email_subject,
      bodyTemplate: s.proposal_email_body,
    });

    await supabase.from("jobs").update({
      job_status: "proposal_sent",
      proposal_sent_at: new Date().toISOString(),
      complete_reminder_sent: false,
    }).eq("id", jobId);

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return {};
  } catch (e) {
    console.error("Proposal generation/email failed:", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
