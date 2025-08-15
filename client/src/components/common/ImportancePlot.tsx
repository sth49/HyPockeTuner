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

    const range = param.values as string[] | boolean[] | number[];

    range.forEach((value) => {
      const data = {
        name:
          value === true
            ? "True"
            : value === false
            ? "False"
            : value.toString(),
        value: 0,
        metricValues: [], // Assuming shapValues is an object with keys as string representations of values
      };
      shapData.push(data);
    });

    Object.entries(param.shapValues).forEach(([key, value]) => {
      const existingData = shapData.find((d) => d.name === key);
      if (existingData) {
        existingData.value = value.meanImpact; // Assuming meanImpact is the value you want to use
        existingData.metricValues = value.metricValues || [];
      } else {
        shapData.push({
          name: key,
          value: value.meanImpact, // Assuming meanImpact is the value you want to use
          metricValues: value.metricValues || [],
        });
      }
    });

    setData(shapData);
  }, [param]);

  const width = svgWidth;
  const fixedBarHeight = 20;
  const totalBarHeight = data.length * fixedBarHeight + (data.length - 1) * 5; // 5px margin between bars
  const height = totalBarHeight + margin.top + margin.bottom;
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  const xAbsoluteMaxValue = useMemo(() => {
    const max = Math.max(...data.map((d) => Math.abs(d.value)), 0);
    const min = Math.min(...data.map((d) => Math.abs(d.value)), 0);
    const absValue = Math.max(Math.abs(max), Math.abs(min));
    return absValue * 1.1;
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
    domain: data.map((d) => d.name),
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
                    <>
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
                    </>
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
                        <span className="btn btn-xs h-[20px] btn-primary text-white rounded-full w-[60px]">
                          {formattedValue}
                        </span>
                      ) : (
                        <span className="btn btn-xs h-[20px] btn-outline rounded-full w-[60px] italic line-through">
                          {formattedValue}
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
