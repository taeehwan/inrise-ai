export type AnalyticsPeriod = "today" | "weekly" | "monthly";

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toISODateStr(value: Date | string | null | undefined): string {
  const parsed = toDate(value);
  return parsed ? parsed.toISOString().split("T")[0] : "";
}

export function getAnalyticsPeriodStart(now: Date, period: AnalyticsPeriod): Date {
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "weekly":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
