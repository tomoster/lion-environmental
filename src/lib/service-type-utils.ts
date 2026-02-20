export function hasLpt(type: string | null): boolean {
  return type === "lpt" || type === "both";
}

export function hasDustSwab(type: string | null): boolean {
  return type === "dust_swab" || type === "both";
}

export function formatServiceType(type: string | null): string {
  if (type === "lpt") return "LPT";
  if (type === "dust_swab") return "Dust Swab";
  if (type === "both") return "LPT + Dust Swab";
  return "\u2014";
}
