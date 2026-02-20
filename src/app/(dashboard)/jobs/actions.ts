"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateEndTime } from "@/lib/scheduling-utils";
import { broadcastJobToWorkers } from "@/lib/telegram/broadcast";

export async function createJob(formData: FormData) {
  const supabase = await createClient();

  const data = {
    client_company: (formData.get("client_company") as string) || null,
    client_email: (formData.get("client_email") as string) || null,
    building_address: (formData.get("building_address") as string) || null,
    has_xrf: formData.get("has_xrf") === "true",
    has_dust_swab: formData.get("has_dust_swab") === "true",
    has_asbestos: formData.get("has_asbestos") === "true",
    num_units: formData.get("num_units") ? Number(formData.get("num_units")) : null,
    price_per_unit: formData.get("price_per_unit") ? Number(formData.get("price_per_unit")) : null,
    num_common_spaces: formData.get("num_common_spaces") ? Number(formData.get("num_common_spaces")) : null,
    price_per_common_space: formData.get("price_per_common_space") ? Number(formData.get("price_per_common_space")) : null,
    num_wipes: formData.get("num_wipes") ? Number(formData.get("num_wipes")) : null,
    scan_date: (formData.get("scan_date") as string) || null,
    start_time: (formData.get("start_time") as string) || null,
    estimated_end_time: (formData.get("estimated_end_time") as string) || null,
    notes: (formData.get("notes") as string) || null,
    worker_id: (formData.get("worker_id") as string) || null,
    job_status: "not_dispatched",
    report_status: "scheduled",
    prospect_id: (formData.get("prospect_id") as string) || null,
  };

  const { data: job, error } = await supabase
    .from("jobs")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: currentJob } = await supabase
    .from("jobs")
    .select("job_status")
    .eq("id", id)
    .single();
  const wasNotDispatched = currentJob?.job_status === "not_dispatched";

  const startTime = (formData.get("start_time") as string) || null;
  const hasXrf = formData.get("has_xrf") === "true";
  const hasDustSwab = formData.get("has_dust_swab") === "true";
  const hasAsbestos = formData.get("has_asbestos") === "true";
  const numUnits = formData.get("num_units") ? Number(formData.get("num_units")) : 0;
  const numCommonSpaces = formData.get("num_common_spaces") ? Number(formData.get("num_common_spaces")) : 0;

  let estimatedEndTime: string | null = null;
  if (startTime && (hasXrf || hasDustSwab || hasAsbestos)) {
    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["xrf_duration_per_unit", "xrf_duration_per_common_space", "dust_swab_duration", "asbestos_duration"]);

    const settingsMap: Record<string, number> = {};
    for (const s of settings ?? []) {
      settingsMap[s.key] = Number(s.value);
    }

    estimatedEndTime = calculateEndTime(
      startTime,
      { has_xrf: hasXrf, has_dust_swab: hasDustSwab, has_asbestos: hasAsbestos },
      numUnits,
      numCommonSpaces,
      {
        xrf_duration_per_unit: settingsMap.xrf_duration_per_unit ?? 15,
        xrf_duration_per_common_space: settingsMap.xrf_duration_per_common_space ?? 10,
        dust_swab_duration: settingsMap.dust_swab_duration ?? 60,
        asbestos_duration: settingsMap.asbestos_duration ?? 60,
      }
    );
  }

  const data = {
    client_company: (formData.get("client_company") as string) || null,
    client_email: (formData.get("client_email") as string) || null,
    building_address: (formData.get("building_address") as string) || null,
    has_xrf: hasXrf,
    has_dust_swab: hasDustSwab,
    has_asbestos: hasAsbestos,
    num_units: formData.get("num_units") ? Number(formData.get("num_units")) : null,
    price_per_unit: formData.get("price_per_unit") ? Number(formData.get("price_per_unit")) : null,
    num_common_spaces: formData.get("num_common_spaces") ? Number(formData.get("num_common_spaces")) : null,
    price_per_common_space: formData.get("price_per_common_space") ? Number(formData.get("price_per_common_space")) : null,
    num_wipes: formData.get("num_wipes") ? Number(formData.get("num_wipes")) : null,
    scan_date: (formData.get("scan_date") as string) || null,
    start_time: startTime,
    estimated_end_time: estimatedEndTime,
    notes: (formData.get("notes") as string) || null,
    worker_id: (() => {
      const v = formData.get("worker_id") as string;
      return v && v !== "unassigned" ? v : null;
    })(),
    job_status: formData.get("job_status") as string,
    report_status: formData.get("report_status") as string,
    updated_at: new Date().toISOString(),
  };

  if (wasNotDispatched) {
    data.job_status = "open";
  }

  const { error } = await supabase.from("jobs").update(data).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  if (wasNotDispatched) {
    const adminClient = createAdminClient();
    await broadcastJobToWorkers(adminClient, id);
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
}

export async function deleteJob(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function uploadReport(jobId: string, formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }

  const ext = file.name.split(".").pop();
  const path = `${jobId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ report_file_path: path, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function createJobFromProspect(prospectId: string) {
  const supabase = await createClient();

  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("company, email, building_address")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    throw new Error("Prospect not found");
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      prospect_id: prospectId,
      client_company: prospect.company,
      client_email: prospect.email,
      building_address: prospect.building_address,
      job_status: "not_dispatched",
      report_status: "scheduled",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}
