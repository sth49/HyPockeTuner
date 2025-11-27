import React, { useState, useRef, useEffect, useMemo } from "react";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { ShapValue } from "../../types/shapValue";
import { useExperimentStore } from "../../stores/experimentStore";

const margin = { top: 10, bottom: 10, left: 70, right: 0 };

interface ImportancePlotProps {
  param: ShapValue;
  toggle: boolean;
}

const UniformImportancePlot: React.FC<ImportancePlotProps> = (props) => {
  const { param, toggle } = props;
  const [svgWidth, setSvgWidth] = useState(0);
  const containerRef = useRef(null);
  const [scatterData, setScatterData] = useState<
    { hyperparam: number; shapValue: number; metricValues: any }[]
  >([]);

  const hparam = useExperimentStore((state) =>
    state.hyperparams?.find((h) => h.name === param.name)
  );
  const range = hparam?.narrowValue || [];
  const beforeChange = hparam?.beforeChange || [];

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
    // Convert shapValues to scatter plot data
    const points: {
      hyperparam: number;
      shapValue: number;
      metricValues: any;
    }[] = [];

    Object.entries(param.shapValues).forEach(([key, value]) => {
      const hyperparamValue = Number(key);
      const shapValue = value.meanImpact;
      const metricValues = value.metricValues || [];

      points.push({
        hyperparam: hyperparamValue,
        shapValue: shapValue,
        metricValues: metricValues,
      });
    });

    // Sort by hyperparam value for better visualization
    points.sort((a, b) => a.hyperparam - b.hyperparam);
    setScatterData(points);
  }, [param]);

  const width = svgWidth;
  const height = 100; // Fixed height for scatter plot
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Y-axis tick values and labels with positioning
  const yTickData = useMemo(() => {
    // Combine range and beforeChange values
    const allValues = [...range, ...beforeChange];
    const uniqueValues = [...new Set(allValues)].sort((a, b) => a - b);

    // If we have more than 4 values, select 4 representative ones
    let selectedValues;
    if (uniqueValues.length <= 4) {
      selectedValues = uniqueValues;
    } else {
      // Select min, max, and 2 values in between
      const min = uniqueValues[0];
      const max = uniqueValues[uniqueValues.length - 1];
      const quarter = uniqueValues[Math.floor(uniqueValues.length / 4)];
      const threeQuarter =
        uniqueValues[Math.floor((uniqueValues.length * 3) / 4)];
      selectedValues = [min, quarter, threeQuarter, max];
    }

    return selectedValues
      .map((value, index) => ({
        value,
        isRange: range.includes(value),
        isBeforeChange: beforeChange.includes(value),
        displayIndex: index, // 표시 순서
      }))
      .sort((a, b) => a.value - b.value);
  }, [range, beforeChange]);

  // Scales
  const xScale = useMemo(() => {
    if (scatterData.length === 0) return scaleLinear({ range: [0, xMax] });

    if (toggle) {
      // Metric values mode - X axis shows metric values (0-100)
      return scaleLinear({
        range: [0, xMax],
        domain: [0, 1],
      });
    } else {
      // SHAP values mode - X axis shows SHAP values
      const shapExtent = [
        Math.min(...scatterData.map((d) => d.shapValue)),
        Math.max(...scatterData.map((d) => d.shapValue)),
      ];

      // Add some padding and ensure 0 is visible
      const maxAbs = Math.max(Math.abs(shapExtent[0]), Math.abs(shapExtent[1]));
      const paddedMax = maxAbs * 1.1;

      return scaleLinear({
        range: [0, xMax],
        domain: [-paddedMax, paddedMax],
      });
    }
  }, [scatterData, xMax, toggle]);

  const yScale = useMemo(() => {
    if (scatterData.length === 0) return scaleLinear({ range: [yMax, 0] });

    // Add some padding
    const padding = (beforeChange[1] - beforeChange[0]) * 0.1 || 1; // Default padding if no range

    return scaleLinear({
      range: [yMax, 0],
      domain: [beforeChange[0] - padding, beforeChange[1] + padding],
    });
  }, [beforeChange, scatterData, yMax]);

  // 라벨 위치 계산 (겹치지 않게) - 값 순서대로 정렬
  // const labelPositions = useMemo(() => {
  //   const labelHeight = 30;
  //   const spacing = 5;
  //   const totalHeight = yMax;

  //   // 값 순서대로 정렬 (큰 값이 위쪽)
  //   const sortedTickData = [...yTickData].sort((a, b) => b.value - a.value);

  //   console.log("sortedTickData", sortedTickData);

  //   const availableHeight =
  //     totalHeight -
  //     sortedTickData.length * labelHeight -
  //     (sortedTickData.length - 1) * spacing;
  //   const startY = Math.max(0, availableHeight / 2);

  //   return sortedTickData.map((tickData, index) => {
  //     const labelY = startY + index * (labelHeight + spacing);
  //     const actualTickY = yScale(tickData.value);

  //     return {
  //       ...tickData,
  //       labelY,
  //       actualTickY,
  //       labelX: -margin.left - 10,
  //     };
  //   });
  // }, [yTickData, yScale, yMax]);

  // 라벨 위치 계산 (겹치지 않게) - 값 순서대로 정렬
  const labelPositions = useMemo(() => {
    const labelHeight = 30;

    // 값 순서대로 정렬 (큰 값이 위쪽)
    const sortedTickData = [...yTickData].sort((a, b) => b.value - a.value);

    // 최대값과 최소값 찾기
    const maxValue = Math.max(...sortedTickData.map((d) => d.value));
    const minValue = Math.min(...sortedTickData.map((d) => d.value));

    return sortedTickData.map((tickData) => {
      const actualTickY = yScale(tickData.value);

      let labelY;

      // 최대값과 최소값은 실제 틱 위치에 배치
      if (tickData.value === maxValue || tickData.value === minValue) {
        labelY = actualTickY - 12; // 라벨 중앙을 틱 위치에 맞춤
      } else {
        // 중간값들은 겹치지 않게 균등 배치
        const middleItems = sortedTickData.filter(
          (d) => d.value !== maxValue && d.value !== minValue
        );
        const middleIndex = middleItems.findIndex(
          (d) => d.value === tickData.value
        );

        if (middleIndex !== -1) {
          // 최대값과 최소값 사이의 공간에서 균등 배치
          const maxY = yScale(maxValue) + labelHeight / 2;
          const minY = yScale(minValue) - labelHeight / 2;
          const availableHeight = minY - maxY - labelHeight;

          if (middleItems.length === 1) {
            // 중간값이 하나면 중앙에 배치
            labelY = maxY + availableHeight / 2;
          } else {
            // 여러 개면 균등 배치
            const step = availableHeight / (middleItems.length + 1);
            labelY = maxY + step * (middleIndex + 1);
          }
        } else {
          // 기본값 (이 경우는 발생하지 않아야 함)
          labelY = actualTickY - labelHeight / 2;
        }
      }

      return {
        ...tickData,
        labelY,
        actualTickY,
        labelX: -margin.left - 12,
      };
    });
  }, [yTickData, yScale, yMax]);
  // 스플라인 경로 생성 함수
  const createSplinePath = (x1: number, y1: number, x2: number, y2: number) => {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} Q ${midX} ${y1} ${midX} ${
      (y1 + y2) / 2
    } Q ${midX} ${y2} ${x2} ${y2}`;
  };

  // Custom tick component for Y-axis (빈 컴포넌트로 실제 틱 숨김)
  const CustomYTick = () => null;

  if (scatterData.length === 0) {
    return (
      <div ref={containerRef} style={{ width: "100%", marginBottom: "20px" }}>
        <div className="text-sm p-4">No data available</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", marginBottom: "20px" }}>
      <svg width={svgWidth} height={height} style={{ overflow: "visible" }}>
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={xMax}
            height={yMax}
            stroke="#e0e0e0"
            strokeWidth={1}
            strokeDasharray="5"
            tickValues={yTickData.map((d) => d.value)}
          />

          {/* Zero line for SHAP values (only when not in toggle mode) */}
          {!toggle && (
            <line
              x1={xScale(0)}
              x2={xScale(0)}
              y1={0}
              y2={yMax}
              stroke="#e0e0e0"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}

          {toggle ? (
            /* Metric values mode - show individual metric points */
            <>
              {scatterData.map((d, i) =>
                d.metricValues.map((metricValue: number, j: number) => (
                  <circle
                    key={`metric-${i}-${j}`}
                    cx={xScale(metricValue)}
                    cy={yScale(d.hyperparam)}
                    r={3}
                    fill="#bdbdbd"
                    stroke="#424242"
                    opacity={0.6}
                  />
                ))
              )}
              <AxisBottom
                scale={xScale}
                top={yMax}
                labelProps={{
                  fontSize: 12,
                  textAnchor: "middle",
                }}
                tickLabelProps={() => ({
                  fontSize: 12,
                  fill: "oklch(55.1% 0.027 264.364)",
                  textAnchor: "middle",
                  verticalAnchor: "middle",
                })}
                numTicks={5}
              />
            </>
          ) : (
            /* SHAP values mode - show scatter plot */
            <>
              {scatterData.map((d, i) => {
                return (
                  <circle
                    key={`shap-${i}`}
                    cx={xScale(d.shapValue)}
                    cy={yScale(d.hyperparam)}
                    r={3}
                    fill={d.shapValue > 0 ? "#28a745" : "#dc3545"}
                    stroke={d.shapValue > 0 ? "#1e7e34" : "#c82333"}
                    strokeWidth={1}
                    opacity={0.7}
                  />
                );
              })}

              <AxisBottom
                scale={xScale}
                top={yMax}
                labelProps={{
                  fontSize: 12,
                  textAnchor: "middle",
                }}
                tickLabelProps={() => ({
                  fontSize: 12,
                  fill: "oklch(55.1% 0.027 264.364)",
                  textAnchor: "middle",
                  verticalAnchor: "middle",
                })}
                numTicks={3}
                // tickFormat={(value) => {
                //   const numValue = Number(value);
                //   return numValue.toFixed(2);
                // }}
              />
            </>
          )}

          <AxisLeft
            scale={yScale}
            labelProps={{
              fontSize: 12,
              textAnchor: "middle",
            }}
            tickValues={yTickData.map((d) => d.value)}
            tickFormat={() => ""} // 빈 문자열로 숨김
            tickComponent={CustomYTick}
            tickLength={6}
          />

          {/* 커스텀 라벨과 스플라인 연결선 */}
          {labelPositions.map((pos, index) => {
            const labelCenterX = pos.labelX + 72; // 라벨 중앙 X 좌표
            const labelCenterY = pos.labelY + 10; // 라벨 중앙 Y 좌표
            const tickX = 0; // Y축 근처 위치
            const tickY = pos.actualTickY; // 실제 틱 위치

            return (
              <g key={`custom-label-${index}`}>
                {/* 스플라인 연결선 */}
                {index !== 0 && index !== labelPositions.length - 1 && (
                  <>
                    <path
                      d={createSplinePath(
                        labelCenterX, // 라벨 오른쪽 끝에서 시작
                        labelCenterY,
                        tickX,
                        tickY
                      )}
                      stroke={
                        pos.isRange
                          ? "oklch(59.435% 0.077 254.027)" // 파란색
                          : "oklch(55.1% 0.027 264.364)"
                      }
                      strokeWidth={2}
                      fill="none"
                      // strokeDasharray={pos.isBeforeChange ? "4,4" : "none"}
                      opacity={0.8}
                    />
                    <circle
                      cx={labelCenterX}
                      cy={labelCenterY}
                      r={3}
                      fill={
                        pos.isRange
                          ? "oklch(59.435% 0.077 254.027)" // 파란색
                          : "oklch(55.1% 0.027 264.364)"
                        // pos.isRange
                        //   ? "#3b82f6"
                        //   : pos.isBeforeChange
                        //   ? "#6b7280"
                        //   : "#6b7280"
                      }
                      opacity={0.9}
                    />
                    <circle
                      cx={tickX}
                      cy={tickY}
                      r={3}
                      fill={
                        pos.isRange
                          ? "oklch(59.435% 0.077 254.027)" // 파란색
                          : "oklch(55.1% 0.027 264.364)"
                        // pos.isRange
                        //   ? "#3b82f6"
                        //   : pos.isBeforeChange
                        //   ? "#6b7280"
                        //   : "#6b7280"
                      }
                      opacity={0.9}
                    />
                  </>
                )}

                {/* 커스텀 라벨 */}
                <foreignObject
                  // x={pos.labelX}
                  x={-margin.left}
                  y={pos.labelY}
                  width={margin.left}
                  height={20}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {pos.isRange ? (
                    <span className="btn btn-xs h-[20px] btn-primary text-white rounded-full w-[60px] text-xs">
                      {hparam?.formatting(pos.value)}
                    </span>
                  ) : pos.isBeforeChange ? (
                    <span className="btn btn-xs h-[20px] btn-outline rounded-full w-[60px] italic line-through text-xs">
                      {/* {pos.value.toFixed(3)} */}
                      {hparam?.formatting(pos.value)}
                    </span>
                  ) : (
                    <span className="btn btn-xs h-[20px] btn-outline rounded-full w-[60px] text-xs">
                      {/* {pos.value.toFixed(3)} */}
                      {hparam?.formatting(pos.value)}
                    </span>
                  )}
                </foreignObject>

                {/* 실제 틱 위치에 작은 점 표시 */}
              </g>
            );
          })}
        </Group>
      </svg>
    </div>
  );
};

export default UniformImportancePlot;
