export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")}${period}`;
}

export function calculateEndTime(
  startTime: string,
  services: { has_xrf: boolean; has_dust_swab: boolean; has_asbestos: boolean },
  numUnits: number,
  numCommonSpaces: number,
  durationSettings: {
    xrf_duration_per_unit: number;
    xrf_duration_per_common_space: number;
    dust_swab_duration: number;
    asbestos_duration: number;
  }
): string {
  let totalMinutes = 0;

  if (services.has_xrf) {
    totalMinutes +=
      numUnits * durationSettings.xrf_duration_per_unit +
      numCommonSpaces * durationSettings.xrf_duration_per_common_space;
  }

  if (services.has_dust_swab) {
    totalMinutes += durationSettings.dust_swab_duration;
  }

  if (services.has_asbestos) {
    totalMinutes += durationSettings.asbestos_duration;
  }

  if (totalMinutes === 0) totalMinutes = 60;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + totalMinutes;

  const endH = Math.floor(endMinutes / 60) % 24;
  const endM = endMinutes % 60;

  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}
