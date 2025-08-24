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
  digit: number = 3
) => {
  if (value === 999) {
    return "999";
  }

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

// 시간대별 아이콘 반환 함수
export const getTimeIcon = (date: string | number | Date): string => {
  const hour = new Date(date).getHours();
  // 오전 6시 - 오후 5시 59분: 태양
  // 오후 6시 - 오전 5시 59분: 달
  return hour >= 6 && hour < 18 ? "☀️" : "🌙";
};

export const formatDate = (
  date: string | number | Date,
  type?: string,
  relatedDate?: string | number | Date,
  showIcon: boolean = false // 아이콘 표시 여부
) => {
  const icon = showIcon ? getTimeIcon(date) + " " : "";

  if (relatedDate) {
    console.log(
      "relatedDate",
      format(new Date(relatedDate), "yyyy.MM.dd. HH:mm")
    );
    console.log("date", format(new Date(date), "yyyy.MM.dd. HH:mm"));
    if (
      format(new Date(date), "MM.dd") !== format(new Date(relatedDate), "MM.dd")
    ) {
      return icon + format(new Date(date), "yyyy.MM.dd. HH:mm");
    }
  }

  if (type === "day") {
    return format(date, "MM.dd");
  } else if (type === "time") {
    return icon + format(date, "HH:mm");
  }

  return icon + format(date, "yyyy.MM.dd. HH:mm");
};
