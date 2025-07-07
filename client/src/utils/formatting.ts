import {
  format,
  FormatDistanceToken,
  formatDistanceToNowStrict,
  formatDistanceStrict,
} from "date-fns";

// number formatting utility
export const formatting = (
  value: number,
  valueType: string,
  digit: number = 1
) => {
  const formatter = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: valueType === "int" ? 0 : digit,
    maximumFractionDigits: digit,
  });

  if (valueType === "int") {
    return formatter.format(Math.round(value));
  } else {
    return formatter.format(value);
  }
};

export function computeMean(arr: number[]) {
  return arr.reduce((sum, a) => sum + a, 0) / arr.length;
}
export function computeStdev(arr: number[]) {
  const mean = computeMean(arr);
  const squareDiffs = arr.map((value) => {
    const diff = value - mean;
    const sqrDiff = diff * diff;
    return sqrDiff;
  });

  const avgSquareDiff = computeMean(squareDiffs);

  const stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

// date formatting utility
const formatDistanceLocale: Record<
  FormatDistanceToken,
  (count: number) => string
> = {
  lessThanXSeconds: (c) => `${c}s`,
  xSeconds: (c) => `${c}s`,
  halfAMinute: () => "30s",
  lessThanXMinutes: (c) => `${c}m`,
  xMinutes: (c) => `${c}m`,
  aboutXHours: (c) => `${c}h`,
  xHours: (c) => `${c}h`,
  xDays: (c) => `${c}d`,
  aboutXWeeks: (c) => `${c}w`,
  xWeeks: (c) => `${c}w`,
  aboutXMonths: (c) => `${c}m`,
  xMonths: (c) => `${c}m`,
  aboutXYears: (c) => `${c}y`,
  xYears: (c) => `${c}y`,
  overXYears: (c) => `${c}y`,
  almostXYears: (c) => `${c}y`,
};
export const formatDistance = (
  date: string | number | Date,
  date2?: string | number | Date
) => {
  if (date2) {
    return formatDistanceStrict(date, date2, {
      locale: { formatDistance: (t, c) => formatDistanceLocale[t](c) },
    });
  }
  return formatDistanceToNowStrict(date, {
    locale: { formatDistance: (t, c) => formatDistanceLocale[t](c) },
  });
};

export const formatDate = (date: string | number | Date, type?: string) => {
  if (type === "day") {
    return format(date, "MM.dd");
  } else if (type === "time") {
    return format(date, "a HH:mm:ss");
  }

  return format(date, "yyyy.MM.dd. a HH:mm");
  // return format(date, "MM.dd.yyyy HH:mm a");
};
