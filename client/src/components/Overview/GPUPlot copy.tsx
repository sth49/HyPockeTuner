import { useEffect, useMemo, useRef } from "react";
import { Group } from "@visx/group";
import { Circle, LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisRight } from "@visx/axis";
import { GridColumns, GridRows } from "@visx/grid";
import { curveMonotoneX } from "@visx/curve";
import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";
// 옆으로 늘어나는 차트
const GPUPlot = () => {
  const gpuInfo = useExperimentStore((state) => state.gpuInfo);

  const chartWidth = Math.max(400, (gpuInfo.length + 2) * 10); // 데이터 양에 따라 차트 너비 결정
  const height = 110; // 모바일에 맞게 높이 축소
  const margin = { top: 15, right: 30, bottom: 30, left: 0 };
  const innerWidth = chartWidth - margin.right - margin.left;
  const innerHeight = height - margin.top - margin.bottom;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRef2 = useRef<HTMLDivElement>(null);

  // 1분 단위로 데이터 집계
  const aggregatedData = useMemo(() => {
    if (!gpuInfo.length) return [];

    const dataByMinute: Record<
      number,
      {
        time: number;
        temperatures: number[];
        utilizations: number[];
        memoryUsages: number[];
      }
    > = {};

    gpuInfo.forEach((item) => {
      const date = new Date(item.time);
      // 분 단위로 반올림
      const minuteKey = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      ).getTime();

      if (!dataByMinute[minuteKey]) {
        dataByMinute[minuteKey] = {
          time: minuteKey,
          temperatures: [],
          utilizations: [],
          memoryUsages: [],
        };
      }

      dataByMinute[minuteKey].temperatures.push(item.temperature);
      dataByMinute[minuteKey].utilizations.push(item.utilization);
      dataByMinute[minuteKey].memoryUsages.push(
        (item.memoryUsed / item.memoryTotal) * 100
      );
    });

    // 평균 계산
    return Object.values(dataByMinute)
      .map((group) => ({
        time: new Date(group.time),
        temperature:
          group.temperatures.reduce((a, b) => a + b, 0) /
          group.temperatures.length,
        utilization:
          group.utilizations.reduce((a, b) => a + b, 0) /
          group.utilizations.length,
        memoryUsage:
          group.memoryUsages.reduce((a, b) => a + b, 0) /
          group.memoryUsages.length,
      }))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [gpuInfo]);

  // 데이터가 업데이트될 때마다 오른쪽 끝으로 스크롤
  useEffect(() => {
    if (scrollRef.current && aggregatedData.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  useEffect(() => {
    if (scrollRef2.current && aggregatedData.length > 0) {
      scrollRef2.current.scrollLeft = scrollRef2.current.scrollWidth;
    }
  }, []);

  // 스케일 설정
  const timeScale = useMemo(() => {
    if (!aggregatedData.length) return scaleTime({ range: [0, innerWidth] });

    return scaleTime({
      range: [0, innerWidth],
      domain: [
        Math.min(...aggregatedData.map((d) => d.time.getTime())) - 10000, // 1분 전
        Math.max(...aggregatedData.map((d) => d.time.getTime())) + 10000, // 1분 후
      ],
    });
  }, [aggregatedData, innerWidth]);

  const tempScale = useMemo(() => {
    if (!aggregatedData.length) return scaleLinear({ range: [innerHeight, 0] });

    return scaleLinear({
      range: [innerHeight, 0],
      domain: [
        Math.min(...aggregatedData.map((d) => d.temperature)) - 2,
        Math.max(...aggregatedData.map((d) => d.temperature)) + 2,
      ],
    });
  }, [aggregatedData, innerHeight]);

  const utilizationScale = useMemo(() => {
    return scaleLinear({
      range: [innerHeight, 0],
      //   domain: [0, 100],
      domain: [
        Math.min(...aggregatedData.map((d) => d.utilization)) - 5 < 0
          ? 0
          : Math.min(...aggregatedData.map((d) => d.utilization)) - 2,
        Math.max(...aggregatedData.map((d) => d.utilization)) + 2,
      ],
    });
  }, [innerHeight]);

  // 접근자 함수들
  const getTime = (d: any) => d.time;
  const getTemperature = (d: any) => d.temperature;
  const getUtilization = (d: any) => d.utilization;
  // const getMemoryUsage = (d) => d.memoryUsage;

  if (!aggregatedData.length) {
    return (
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="GPU Monitoring" />
        <div className="text-gray-500 text-sm">No GPU data available</div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <HeaderText text="GPU Monitoring" />
      <div className="w-full h-full">
        {/* 온도 차트 */}
        <div className="relative ">
          <p>Temperature (°C)</p>
          <svg
            width={margin.right}
            height={height}
            style={{ position: "absolute", right: 0, top: 24 }}
            className="absolute z-10 bg-white"
          >
            <Group left={0} top={margin.top}>
              <AxisRight
                scale={tempScale}
                numTicks={4}
                tickFormat={(value) => `${Math.round(Number(value))}°`}
                tickLabelProps={() => ({
                  fill: "#666",
                  fontSize: 13,
                  textAnchor: "start",
                  verticalAnchor: "middle",
                })}
              />
            </Group>
          </svg>
          <div className="overflow-x-auto" ref={scrollRef}>
            <svg width={chartWidth} height={height}>
              <Group left={margin.left} top={margin.top}>
                <GridRows
                  scale={tempScale}
                  width={innerWidth}
                  height={innerHeight}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                />
                <GridColumns
                  scale={timeScale}
                  width={innerWidth}
                  height={innerHeight}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                  numTicks={Math.min(aggregatedData.length, 10)}
                />
                <LinePath
                  data={aggregatedData}
                  x={(d) => timeScale(getTime(d))}
                  y={(d) => tempScale(getTemperature(d))}
                  stroke="oklch(55.1% 0.027 264.364)"
                  strokeWidth={2}
                  curve={curveMonotoneX}
                />
                {aggregatedData.length > 0 &&
                  aggregatedData.map((d, i) => (
                    <Circle
                      key={i}
                      cx={timeScale(getTime(d))}
                      cy={tempScale(getTemperature(d))}
                      r={3}
                      fill="oklch(55.1% 0.027 264.364)"
                    />
                  ))}

                <AxisBottom
                  top={innerHeight}
                  scale={timeScale}
                  numTicks={Math.min(aggregatedData.length, 6)}
                  tickFormat={(value) => {
                    const date = new Date(value as number);
                    return `${date
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${date
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`;
                  }}
                  tickLabelProps={() => ({
                    fill: "oklch(55.1% 0.027 264.364)",
                    fontSize: 13,
                    textAnchor: "middle",
                    verticalAnchor: "middle",
                  })}
                />
              </Group>
            </svg>
          </div>
        </div>

        <div className="relative ">
          <p>Utilization (%)</p>
          <svg
            width={margin.right}
            height={height - margin.top}
            style={{ position: "absolute", right: 0, top: 24 }}
            className="absolute z-10 bg-white"
          >
            <Group left={0} top={margin.top}>
              <AxisRight
                scale={utilizationScale}
                numTicks={4}
                tickFormat={(value) => `${Math.round(Number(value))}%`}
                tickLabelProps={() => ({
                  fill: "oklch(55.1% 0.027 264.364)",
                  fontSize: 13,
                  textAnchor: "start",
                  verticalAnchor: "middle",
                })}
              />
            </Group>
          </svg>
          <div className="overflow-x-auto" ref={scrollRef2}>
            <svg width={chartWidth} height={height}>
              <Group left={margin.left} top={margin.top}>
                <GridRows
                  scale={utilizationScale}
                  width={innerWidth}
                  height={innerHeight}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                />
                <GridColumns
                  scale={timeScale}
                  width={innerWidth}
                  height={innerHeight}
                  stroke="#f0f0f0"
                  strokeWidth={1}
                  numTicks={Math.min(aggregatedData.length, 10)}
                />
                <LinePath
                  data={aggregatedData}
                  x={(d) => timeScale(getTime(d))}
                  y={(d) => utilizationScale(getUtilization(d))}
                  stroke="oklch(55.1% 0.027 264.364)"
                  strokeWidth={2}
                  curve={curveMonotoneX}
                />
                {aggregatedData.length > 0 &&
                  aggregatedData.map((d, i) => (
                    <Circle
                      key={i}
                      cx={timeScale(getTime(d))}
                      cy={utilizationScale(getUtilization(d))}
                      r={3}
                      fill="oklch(55.1% 0.027 264.364)"
                    />
                  ))}

                {/* <LinePath
                data={aggregatedData}
                x={(d) => timeScale(getTime(d))}
                y={(d) => utilizationScale(getMemoryUsage(d))}
                stroke="#10b981"
                strokeWidth={2}
                curve={curveMonotoneX}
                strokeDasharray="5,3"
              /> */}
                {/* <LinePath
                data={aggregatedData}
                x={(d) => timeScale(getTime(d))}
                y={(d) => utilizationScale(get(d))}
                stroke="#ef4444"
                strokeWidth={2}
                curve={curveMonotoneX}
              /> */}
                <AxisBottom
                  top={innerHeight}
                  scale={timeScale}
                  numTicks={Math.min(aggregatedData.length, 6)}
                  tickFormat={(value) => {
                    const date = new Date(value as number);
                    return `${date
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${date
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`;
                  }}
                  tickLabelProps={() => ({
                    fill: "#666",
                    fontSize: 13,
                    textAnchor: "middle",
                  })}
                />
              </Group>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPUPlot;
