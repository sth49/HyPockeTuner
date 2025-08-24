import React, { useState, useRef, useEffect, useMemo } from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Text } from "@visx/text";
import { ShapValue } from "../../types/shapValue";
import { NumberValue } from "d3";
import { useExperimentStore } from "../../stores/experimentStore";
import { formatting } from "../../utils";

const margin = { top: 10, bottom: 10, left: 70, right: 0 };

interface ImportancePlotProps {
  param: ShapValue;
  toggle: boolean;
}

const ImportancePlot: React.FC<ImportancePlotProps> = (props) => {
  const { param, toggle } = props;
  const [svgWidth, setSvgWidth] = useState(0);
  const containerRef = useRef(null);
  const [data, setData] = useState<
    { name: string; value: number; metricValues: any }[]
  >([]);

  const hparam = useExperimentStore((state) =>
    state.hyperparams?.find((h) => h.name === param.name)
  );

  // 텍스트를 중간에서 자르고 말줄임표를 추가하는 함수
  const truncateMiddle = (text: string, maxLength: number = 8) => {
    if (text.length <= maxLength) return text;

    const start = Math.ceil(maxLength / 2) - 1;
    const end = Math.floor(maxLength / 2) - 1;

    return text.slice(0, start) + "..." + text.slice(-end);
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          setSvgWidth(entry.contentRect.width);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shapData: { name: string; value: number; metricValues: any }[] = [];

    // 숫자 값을 일관된 형태로 정규화하는 함수
    const normalizeValue = (value: any): string => {
      if (value === true) return "True";
      if (value === false) return "False";

      const num = parseFloat(value);
      if (!isNaN(num)) {
        // 과학적 표기법으로 통일 (1e-05 형태)
        if (num < 0.001 && num > 0) {
          return num.toExponential().replace("+", "");
        } else if (num > 1000) {
          return num.toExponential().replace("+", "");
        } else {
          return num.toString();
        }
      }

      return value.toString();
    };

    const range = param.values as string[] | boolean[] | number[];

    // 먼저 모든 범위의 값에 대해 초기 데이터 생성
    range.forEach((value) => {
      const normalizedName = normalizeValue(value);
      shapData.push({
        name: normalizedName,
        value: 0,
        metricValues: [],
      });
    });
    // 실제 SHAP 값이 있는 데이터로 업데이트
    if (param.shapValues && Object.keys(param.shapValues).length > 0) {
      Object.entries(param.shapValues).forEach(([key, value]) => {
        const normalizedKey = normalizeValue(key);
        const existingData = shapData.find((d) => d.name === normalizedKey);
        if (existingData) {
          existingData.value = value.meanImpact || 0;
          existingData.metricValues = value.metricValues || [];
        } else {
          // range에 없는 값이 샘플링된 경우 추가
          shapData.push({
            name: normalizedKey,
            value: value.meanImpact || 0,
            metricValues: value.metricValues || [],
          });
        }
      });
    }
    // 중복 제거
    const uniqueData = shapData.reduce((acc, current) => {
      const existing = acc.find((item) => item.name === current.name);
      if (existing) {
        // 기존 데이터가 있으면 값이 더 큰 것으로 업데이트 (또는 병합)
        existing.value = existing.value || current.value;
        existing.metricValues = [
          ...(existing.metricValues || []),
          ...(current.metricValues || []),
        ];
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as typeof shapData);

    setData(uniqueData);
  }, [param]);

  const width = svgWidth;
  const fixedBarHeight = 20;
  // 최소 높이를 보장하여 값이 1개일 때도 충분한 공간 확보
  const minHeight = 60;
  const calculatedHeight =
    data.length * fixedBarHeight + Math.max(0, data.length - 1) * 5;
  const totalBarHeight = Math.max(minHeight, calculatedHeight);
  const height = totalBarHeight + margin.top + margin.bottom;
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const xAbsoluteMaxValue = useMemo(() => {
    // NaN 값을 필터링하고 유효한 숫자만 사용
    const validValues = data
      .map((d) => d.value)
      .filter((v) => !isNaN(v) && isFinite(v));

    if (validValues.length === 0) {
      return 1; // 기본값으로 1 사용
    }

    const max = Math.max(...validValues.map((d) => Math.abs(d)), 0);
    const min = Math.min(...validValues.map((d) => Math.abs(d)), 0);
    const absValue = Math.max(Math.abs(max), Math.abs(min));
    return Math.max(absValue * 1.1, 0.1); // 최소값 보장
  }, [data]);

  // Scales
  const xScale = scaleLinear({
    range: [0, xMax],
    domain: [-xAbsoluteMaxValue, xAbsoluteMaxValue],
    clamp: true,
  });

  const metricX = scaleLinear({
    range: [0, xMax],
    domain: [0, 1],
  });

  const yScale = scaleBand<string>({
    range: [0, totalBarHeight],
    domain: data
      .slice()
      .sort((a, b) => {
        // ordinal 하이퍼파라미터인 경우 숫자 크기 순으로 정렬
        const numA = parseFloat(a.name);
        const numB = parseFloat(b.name);

        // 둘 다 숫자로 변환 가능한 경우 숫자 크기 순으로 정렬
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }

        // 그 외의 경우 문자열 순으로 정렬 (Boolean 등)
        return a.name.localeCompare(b.name);
      })
      .map((d) => d.name),
    padding: 0.2, // padding 추가로 간격 확보
  });
  const getStableJitter = (value: number, index: number, bandWidth: number) => {
    // 값과 인덱스를 조합해서 안정적인 해시 생성
    const hash = (value * 1000 + index) % 1000;
    const normalizedHash = hash / 1000; // 0-1 범위로 정규화
    const jitterRange = Math.min(bandWidth * 0.3, 15); // 밴드폭의 30% 또는 최대 15px
    return (normalizedHash - 0.5) * jitterRange;
  };

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", marginBottom: "20px" }}>
        <svg
          width={svgWidth}
          height={height}
          style={{ overflow: "visible" }} // Ensure the SVG does not clip content
        >
          <Group left={margin.left} top={margin.top}>
            {data.map((d) => {
              const barY2 =
                (yScale(d.name) ?? 0) + (yScale.bandwidth?.() ?? 0) / 2; // 막대의 중심 y 위치
              return (
                <line
                  key={`line1-${d.name}`}
                  x1={0}
                  x2={xMax}
                  y1={barY2}
                  y2={barY2}
                  stroke="#e0e0e0"
                  strokeWidth={1} // 선의 두께
                  strokeDasharray={"5"}
                />
              );
            })}
            {toggle ? (
              <>
                {data.map((d) => {
                  if (!d.metricValues || d.metricValues.length === 0) {
                    return null; // Skip rendering if shapValues is empty
                  }

                  return (
                    <g key={`circles-${d.name}`}>
                      {d.metricValues.map((v: NumberValue, index: number) => {
                        const numValue = Number(v);
                        const circleX = metricX(numValue) ?? 0;
                        const circleY =
                          (yScale(d.name) ?? 0) +
                          (yScale.bandwidth?.() ?? 0) / 2;
                        const jitter = getStableJitter(
                          numValue,
                          index,
                          yScale.bandwidth?.() ?? 0
                        );

                        return (
                          <circle
                            key={`circle-${d.name}-${index}`}
                            cx={circleX}
                            cy={circleY + jitter}
                            r={3}
                            fill="#bdbdbd"
                            stroke="#424242"
                          />
                        );
                      })}
                    </g>
                  );
                })}
                <AxisBottom
                  scale={metricX}
                  top={yMax}
                  labelProps={{
                    fontSize: 12, // 레
                    textAnchor: "middle", // 레이블의 정렬
                  }}
                  tickLabelProps={() => ({
                    fontSize: 12,
                    fill: "oklch(55.1% 0.027 264.364)",
                    textAnchor: "middle", // 텍스트 정렬
                    verticalAnchor: "middle", // 텍스트 수직 정렬
                  })}
                  tickFormat={(d) =>
                    formatting(
                      Number(d),
                      Number.isInteger(d) ? "int" : "float",
                      2
                    )
                  }
                  numTicks={5} // x축 눈금 개수
                  tickStroke="#8e205f"
                  hideTicks={false}
                ></AxisBottom>
              </>
            ) : (
              <>
                {data.map((d) => {
                  // Effect 값이 유효하지 않으면 막대를 그리지 않음 (하지만 Y축 레이블은 표시됨)
                  if (isNaN(d.value) || d.value === 0) {
                    return null;
                  }

                  const barWidth = Math.abs(xScale(d.value) - xScale(0));
                  const barX = d.value > 0 ? xScale(0) : xScale(d.value);
                  const barY = yScale(d.name) ?? 0;
                  const textX = d.value > 0 ? barX + 5 : barX + barWidth - 5; // 텍스트 위치 조정
                  const textAnchor = d.value > 0 ? "start" : "end"; // 텍스트 정렬 방향

                  return (
                    <g key={`bar-group-${d.name}`}>
                      <Bar
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={fixedBarHeight}
                        fill={d.value > 0 ? "#28a745" : "#dc3545"}
                        opacity={0.5}
                      />
                      <Text
                        x={textX}
                        y={barY + fixedBarHeight / 2} // 막대의 중앙 높이
                        fontSize={10}
                        fill="#000" // 텍스트 색상
                        textAnchor={textAnchor}
                        verticalAnchor="middle"
                      >
                        {d.value > 0
                          ? "+ " + d.value.toFixed(2)
                          : "- " + Math.abs(d.value).toFixed(2)}
                      </Text>
                    </g>
                  );
                })}
                <AxisBottom
                  scale={xScale}
                  top={yMax}
                  labelProps={{
                    fontSize: 12, // 레
                    textAnchor: "middle", // 레이블의 정렬
                  }}
                  tickLabelProps={() => ({
                    fontSize: 12,
                    fill: "oklch(55.1% 0.027 264.364)",
                    textAnchor: "middle", // 텍스트 정렬
                    verticalAnchor: "middle", // 텍스트 수직 정렬
                  })}
                  tickFormat={(d) =>
                    formatting(
                      Number(d),
                      Number.isInteger(d) ? "int" : "float",
                      2
                    )
                  }
                  numTicks={5} // x축 눈금 개수
                  tickStroke="#8e205f"
                  hideTicks={false}
                ></AxisBottom>
              </>
            )}

            <AxisLeft
              scale={yScale}
              // hideTicks={true}
              tickComponent={({ formattedValue, ...tickProps }) => {
                const isValidValue = hparam?.checkValueInSpace(formattedValue);
                return (
                  <foreignObject
                    x={-margin.left}
                    y={tickProps.y - 10}
                    width={margin.left}
                    height={fixedBarHeight}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <>
                      {isValidValue ? (
                        <span
                          className="btn btn-xs h-[20px] btn-primary text-white rounded-full w-[60px]"
                          title={formattedValue || ''}
                        >
                          {truncateMiddle(formattedValue || '')}
                        </span>
                      ) : (
                        <span
                          className="btn btn-xs h-[20px] btn-outline rounded-full w-[60px] italic line-through"
                          title={formattedValue || ''}
                        >
                          {truncateMiddle(formattedValue || '')}
                        </span>
                      )}
                    </>
                  </foreignObject>
                );
              }}
              tickLength={6}
              tickLabelProps={() => ({
                fontSize: 12,

                // fill: "#424242",
                fill: "oklch(55.1% 0.027 264.364)",
                textAnchor: "end",
                verticalAnchor: "middle",
              })}
            ></AxisLeft>
          </Group>
        </svg>
      </div>
    </>
  );
};

export default ImportancePlot;
