"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateProposals } from "@/lib/proposals/generate";
import { sendProposalEmail } from "@/lib/email/send-proposal";

export async function sendProposal(jobId: string, emailOverrides?: { subject: string; body: string }): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("job_number, client_company, client_email")
    .eq("id", jobId)
    .single();

  if (!job) return { error: "Job not found" };
  if (!job.client_email) return { error: "No client email set" };

  const { data: properties } = await supabase
    .from("properties")
    .select("id, building_address, num_units, has_xrf, has_dust_swab, has_asbestos, num_studios_1bed, xrf_price_studios_1bed, num_2_3bed, xrf_price_2_3bed, num_common_spaces, xrf_price_per_common_space, num_wipes, wipe_rate, dust_swab_site_visit_rate, dust_swab_proj_mgmt_rate, num_asbestos_samples, asbestos_sample_rate, asbestos_site_visit_rate, has_studios_1bed, has_2_3bed, has_common_spaces, has_wipes, has_asbestos_samples")
    .eq("job_id", jobId);

  if (!properties || properties.length === 0) return { error: "No properties found for this job" };

  const hasAnyService = properties.some(p => p.has_xrf || p.has_dust_swab || p.has_asbestos);
  if (!hasAnyService) return { error: "No service types selected on any property" };

  try {
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["sender_name", "proposal_email_subject", "proposal_email_body", "tax_rate", "business_name", "business_phone", "business_email", "business_check_address", "email_signature", "certification_number"]);

    const s: Record<string, string> = Object.fromEntries(
      (settingsRows ?? []).map(({ key, value }) => [key, value])
    );

    const taxRate = s.tax_rate ? parseFloat(s.tax_rate) / 100 : 0.0888;
    const bizInfo = {
      businessName: s.business_name,
      businessAddress: s.business_check_address,
      businessPhone: s.business_phone,
      certificationNumber: s.certification_number,
    };
    const jobInfo = { job_number: job.job_number, client_company: job.client_company };

    const proposalsByProperty = await Promise.all(
      properties.map(async (prop) => ({
        propertyId: prop.id,
        proposals: await generateProposals(prop, jobInfo, taxRate, bizInfo),
      }))
    );

    const allProposals = proposalsByProperty.flatMap(p => p.proposals);
    if (allProposals.length === 0) return { error: "No proposals generated" };

    const addresses = properties
      .map(p => p.building_address)
      .filter(Boolean)
      .join(", ");

    await sendProposalEmail({
      to: job.client_email,
      jobNumber: job.job_number,
      clientCompany: job.client_company ?? "",
      buildingAddress: addresses,
      attachments: allProposals,
      senderName: s.sender_name ?? "Lion Environmental",
      subjectTemplate: emailOverrides ? undefined : s.proposal_email_subject,
      bodyTemplate: emailOverrides ? undefined : s.proposal_email_body,
      subjectFinal: emailOverrides?.subject,
      bodyFinal: emailOverrides?.body,
      businessName: s.business_name,
      businessPhone: s.business_phone,
      businessEmail: s.business_email,
      signatureText: s.email_signature,
    });

    try {
      for (const { propertyId, proposals } of proposalsByProperty) {
        for (const proposal of proposals) {
          const storagePath = `proposals/${jobId}/${propertyId}/proposal_${proposal.type}-${Date.now()}.pdf`;
          await supabase.storage.from("reports").upload(storagePath, proposal.buffer, {
            contentType: "application/pdf",
          });
          await supabase.from("job_documents").insert({
            job_id: jobId,
            property_id: propertyId,
            document_type: `proposal_${proposal.type}`,
            file_path: storagePath,
            original_filename: proposal.filename,
          });
        }
      }
    } catch (storageErr) {
      console.error("Failed to store proposals (email was sent):", storageErr);
    }

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
