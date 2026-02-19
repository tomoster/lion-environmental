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
  serviceType: string,
  numUnits: number,
  numCommonSpaces: number,
  durationSettings: {
    lpt_duration_per_unit: number;
    lpt_duration_per_common_space: number;
    dust_swab_duration: number;
  }
): string {
  let totalMinutes: number;

  if (serviceType === "lpt") {
    totalMinutes =
      numUnits * durationSettings.lpt_duration_per_unit +
      numCommonSpaces * durationSettings.lpt_duration_per_common_space;
  } else {
    totalMinutes = durationSettings.dust_swab_duration;
  }

  if (totalMinutes === 0) totalMinutes = 60;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + totalMinutes;

  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;

  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}
