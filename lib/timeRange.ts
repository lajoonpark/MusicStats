import { ParsedListen } from "@/types/music";

export type TimeRangeKey =
  | "all_time"
  | "this_year"
  | "last_year"
  | "last_6_months"
  | "last_3_months"
  | "this_month"
  | "last_month"
  | "this_week"
  | "last_week";

export interface TimeRangeOption {
  key: TimeRangeKey;
  label: string;
}

export interface TimeRangeBounds {
  start: Date | null;
  end: Date;
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { key: "all_time", label: "All time" },
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
  { key: "last_6_months", label: "Last 6 months" },
  { key: "last_3_months", label: "Last 3 months" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfWeekMonday = (date: Date): Date => {
  const current = startOfDay(date);
  const day = current.getDay();
  const distanceToMonday = day === 0 ? 6 : day - 1;
  current.setDate(current.getDate() - distanceToMonday);
  return current;
};

const shiftMonths = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

export function getTimeRangeBounds(range: TimeRangeKey, now = new Date()): TimeRangeBounds {
  const current = new Date(now);

  switch (range) {
    case "all_time":
      return { start: null, end: current };
    case "this_year": {
      const start = new Date(current.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start, end: current };
    }
    case "last_year": {
      const year = current.getFullYear() - 1;
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    case "last_6_months":
      return { start: shiftMonths(current, -6), end: current };
    case "last_3_months":
      return { start: shiftMonths(current, -3), end: current };
    case "this_month": {
      const start = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
      return { start, end: current };
    }
    case "last_month": {
      const start = new Date(current.getFullYear(), current.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(current.getFullYear(), current.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "this_week": {
      const start = startOfWeekMonday(current);
      return { start, end: current };
    }
    case "last_week": {
      const thisWeekStart = startOfWeekMonday(current);
      const start = new Date(thisWeekStart);
      start.setDate(start.getDate() - 7);
      const end = endOfDay(new Date(thisWeekStart.getTime() - MS_PER_DAY));
      return { start: startOfDay(start), end };
    }
    default:
      return { start: null, end: current };
  }
}

export function filterPlaysByTimeRange(plays: ParsedListen[], range: TimeRangeKey, now = new Date()): ParsedListen[] {
  const { start, end } = getTimeRangeBounds(range, now);
  const startMs = start?.getTime() ?? Number.NEGATIVE_INFINITY;
  const endMs = end.getTime();

  return plays.filter((play) => play.playedAtMs >= startMs && play.playedAtMs <= endMs);
}

export function formatDateRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
