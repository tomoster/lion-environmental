export function formatServiceTypes(job: {
  has_xrf: boolean;
  has_dust_swab: boolean;
  has_asbestos: boolean;
}): string {
  const parts: string[] = [];
  if (job.has_xrf) parts.push("XRF");
  if (job.has_dust_swab) parts.push("Dust Swab");
  if (job.has_asbestos) parts.push("Asbestos");
  return parts.length > 0 ? parts.join(" + ") : "\u2014";
}
