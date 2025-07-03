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
