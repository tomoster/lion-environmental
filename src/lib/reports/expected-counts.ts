export function getExpectedReportCount(
  reportType: "xrf" | "dust_swab" | "asbestos",
  property: { num_studios_1bed: number | null; num_2_3bed: number | null; num_common_spaces: number | null; num_wipes: number | null; num_asbestos_samples: number | null }
): number {
  if (reportType === "xrf") {
    return (property.num_studios_1bed ?? 0) + (property.num_2_3bed ?? 0) + (property.num_common_spaces ?? 0);
  }
  if (reportType === "asbestos") {
    return property.num_asbestos_samples ?? 0;
  }
  return property.num_wipes ?? 0;
}
