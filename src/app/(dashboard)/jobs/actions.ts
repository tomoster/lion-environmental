"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateEndTime } from "@/lib/scheduling-utils";
import { autoSendReports } from "@/lib/reports/auto-send";
import { getExpectedReportCount } from "@/lib/reports/expected-counts";

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
    num_common_spaces: formData.get("num_common_spaces") ? Number(formData.get("num_common_spaces")) : null,
    num_wipes: formData.get("num_wipes") ? Number(formData.get("num_wipes")) : null,
    scan_date: (formData.get("scan_date") as string) || null,
    start_time: (formData.get("start_time") as string) || null,
    estimated_end_time: (formData.get("estimated_end_time") as string) || null,
    notes: (formData.get("notes") as string) || null,
    worker_id: (formData.get("worker_id") as string) || null,
    report_writer_id: (() => {
      const v = formData.get("report_writer_id") as string;
      return v && v !== "unassigned" ? v : null;
    })(),
    job_status: "not_dispatched",
    report_status: "not_started",
    dust_swab_status: "not_started",
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

export async function updateJob(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: currentJob } = await supabase
    .from("jobs")
    .select("job_status, start_time, report_status, dust_swab_status, asbestos_status")
    .eq("id", id)
    .single();

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
    num_studios_1bed: formData.get("num_studios_1bed") ? Number(formData.get("num_studios_1bed")) : null,
    xrf_price_studios_1bed: formData.get("xrf_price_studios_1bed") ? Number(formData.get("xrf_price_studios_1bed")) : null,
    num_2_3bed: formData.get("num_2_3bed") ? Number(formData.get("num_2_3bed")) : null,
    xrf_price_2_3bed: formData.get("xrf_price_2_3bed") ? Number(formData.get("xrf_price_2_3bed")) : null,
    num_common_spaces: formData.get("num_common_spaces") ? Number(formData.get("num_common_spaces")) : null,
    num_wipes: formData.get("num_wipes") ? Number(formData.get("num_wipes")) : null,
    wipe_rate: formData.get("wipe_rate") ? Number(formData.get("wipe_rate")) : null,
    dust_swab_site_visit_rate: formData.get("dust_swab_site_visit_rate") ? Number(formData.get("dust_swab_site_visit_rate")) : null,
    dust_swab_proj_mgmt_rate: formData.get("dust_swab_proj_mgmt_rate") ? Number(formData.get("dust_swab_proj_mgmt_rate")) : null,
    num_asbestos_samples: formData.get("num_asbestos_samples") ? Number(formData.get("num_asbestos_samples")) : null,
    asbestos_sample_rate: formData.get("asbestos_sample_rate") ? Number(formData.get("asbestos_sample_rate")) : null,
    asbestos_site_visit_rate: formData.get("asbestos_site_visit_rate") ? Number(formData.get("asbestos_site_visit_rate")) : null,
    scan_date: (formData.get("scan_date") as string) || null,
    start_time: startTime,
    estimated_end_time: estimatedEndTime,
    notes: (formData.get("notes") as string) || null,
    worker_id: (() => {
      const v = formData.get("worker_id") as string;
      return v && v !== "unassigned" ? v : null;
    })(),
    report_writer_id: (() => {
      const v = formData.get("report_writer_id") as string;
      return v && v !== "unassigned" ? v : null;
    })(),
    report_status: (() => {
      const formVal = formData.get("report_status") as string;
      const dbVal = currentJob?.report_status ?? "not_started";
      const locked = ["uploaded", "sent"];
      return locked.includes(dbVal) && !locked.includes(formVal) ? dbVal : formVal;
    })(),
    dust_swab_status: (() => {
      const formVal = (formData.get("dust_swab_status") as string) || "not_started";
      const dbVal = currentJob?.dust_swab_status ?? "not_started";
      const locked = ["uploaded", "sent"];
      return locked.includes(dbVal) && !locked.includes(formVal) ? dbVal : formVal;
    })(),
    asbestos_status: (() => {
      const formVal = (formData.get("asbestos_status") as string) || "not_started";
      const dbVal = currentJob?.asbestos_status ?? "not_started";
      const locked = ["uploaded", "sent"];
      return locked.includes(dbVal) && !locked.includes(formVal) ? dbVal : formVal;
    })(),
    updated_at: new Date().toISOString(),
  };

  if (startTime !== currentJob?.start_time) {
    (data as Record<string, unknown>).complete_reminder_sent = false;
  }

  const { error } = await supabase.from("jobs").update(data).eq("id", id);

  if (error) {
    throw new Error(error.message);
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

export async function uploadReport(jobId: string, reportType: "xrf" | "dust_swab" | "asbestos", formData: FormData) {
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

  const { error: insertError } = await supabase.from("job_reports").insert({
    job_id: jobId,
    report_type: reportType,
    file_path: path,
    original_filename: file.name,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("num_studios_1bed, num_2_3bed, num_common_spaces, num_wipes, num_asbestos_samples")
    .eq("id", jobId)
    .single();

  const expected = job ? getExpectedReportCount(reportType, job) : 0;

  const statusColumnMap: Record<string, string> = {
    xrf: "report_status",
    dust_swab: "dust_swab_status",
    asbestos: "asbestos_status",
  };
  const statusColumn = statusColumnMap[reportType];

  if (statusColumn && expected > 0) {
    const { count: uploadedCount } = await supabase
      .from("job_reports")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("report_type", reportType);

    if ((uploadedCount ?? 0) >= expected) {
      await supabase
        .from("jobs")
        .update({
          [statusColumn]: "uploaded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  }

  const adminClient = createAdminClient();
  await autoSendReports(adminClient, jobId);

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
      report_status: "not_started",
      dust_swab_status: "not_started",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}
