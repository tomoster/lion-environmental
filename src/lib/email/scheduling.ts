export function nextBusinessDaySend(): string {
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  next.setUTCHours(14, Math.floor(Math.random() * 60), 0, 0);
  const day = next.getUTCDay();
  if (day === 6) next.setDate(next.getDate() + 2);
  if (day === 0) next.setDate(next.getDate() + 1);
  return next.toISOString();
}
