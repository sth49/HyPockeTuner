import { useMemo } from "react";
import { useColorScale } from "../../utils/colorScale";
import { formatting } from "../../utils/utils";

interface LegendProps {
  type?: "metric" | "loss";
  width?: number;
  height?: number;
}

interface LegendConfig {
  colorScale: (value: number) => string;
  range: { min: number; max: number };
  minLabel: string;
  maxLabel: string;
}

const Legend = ({ type = "metric", width = 70, height = 10 }: LegendProps) => {
  const { metricColorScale, lossColorScale, metricRange, lossRange } =
    useColorScale();

  // Legend 설정을 메모이제이션
  const legendConfig: LegendConfig = useMemo(() => {
    if (type === "metric") {
      return {
        colorScale: metricColorScale,
        range: metricRange,
        minLabel: formatting(metricRange.min, "int"),
        maxLabel: formatting(metricRange.max, "int"),
      };
    } else {
      return {
        colorScale: lossColorScale,
        range: lossRange,
        minLabel: formatting(lossRange.max, "float", 2), // loss는 높은 값이 나쁨
        maxLabel: formatting(lossRange.min, "float", 2), // loss는 낮은 값이 좋음
      };
    }
  }, [type, metricColorScale, lossColorScale, metricRange, lossRange]);

  // 그라디언트 스톱 생성
  const gradientStops = useMemo(() => {
    return [0, 20, 40, 60, 80, 100].map((value, index) => ({
      key: index,
      offset: `${value}%`,
      color: legendConfig.colorScale(
        type === "metric" ? value / 100 : (100 - value) / 100 // loss는 반대로 적용
      ),
    }));
  }, [legendConfig]);

  // 고유한 gradient ID 생성
  const gradientId = `legendGradient-${type}`;

  return (
    <div
      className="flex items-center justify-between gap-1"
      style={{
        width: `${width + 110}px`,
        height: `${height + 10}px`,
      }}
    >
      <div className="text-xs uppercase w-[45px] font-bold">{type}</div>

      <div className="flex items-center space-x-1 flex-1 justify-around">
        <span className="text-xs text-gray-600 w-[20px] text-center">
          {legendConfig.minLabel}
        </span>

        <div className="flex justify-center">
          <svg width={width} height={height} className="block">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {gradientStops.map(({ key, offset, color }) => (
                  <stop key={key} offset={offset} stopColor={color} />
                ))}
              </linearGradient>
            </defs>
            <rect
              width={width}
              height={height}
              fill={`url(#${gradientId})`}
              rx={2}
              className="drop-shadow-sm"
            />
          </svg>
        </div>

        {/* 최대값 라벨 */}
        <span className="text-xs text-gray-600 w-[20px] text-center">
          {legendConfig.maxLabel}
        </span>
      </div>
    </div>
  );
};

export default Legend;
