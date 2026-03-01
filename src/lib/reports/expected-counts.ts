export function getExpectedReportCount(
  reportType: "xrf" | "dust_swab" | "asbestos",
  job: { num_studios_1bed: number | null; num_2_3bed: number | null; num_common_spaces: number | null; num_wipes: number | null; num_asbestos_samples: number | null }
): number {
  if (reportType === "xrf") {
    return (job.num_studios_1bed ?? 0) + (job.num_2_3bed ?? 0) + (job.num_common_spaces ?? 0);
  }
  if (reportType === "asbestos") {
    return job.num_asbestos_samples ?? 0;
  }
  return job.num_wipes ?? 0;
}
