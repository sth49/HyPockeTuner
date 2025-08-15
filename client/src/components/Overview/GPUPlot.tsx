import { useMemo } from "react";
import { Group } from "@visx/group";
import { Circle, LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisRight } from "@visx/axis";
import { GridColumns, GridRows } from "@visx/grid";
import { curveMonotoneX } from "@visx/curve";
import { ParentSize } from "@visx/responsive";
import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";

interface GPUPlotInnerProps {
  width: number;
  height: number;
}

const GPUPlotInner = ({ width: parentWidth }: GPUPlotInnerProps) => {
  const gpuInfo = useExperimentStore((state) => state.gpuInfo);

  const chartWidth = parentWidth || 400;
  const height = 110; // 모바일에 맞게 높이 축소
  const margin = { top: 15, right: 50, bottom: 30, left: 10 };
  const legendWidth = 30;
  const innerWidth = chartWidth - margin.right - margin.left - legendWidth;
  const innerHeight = height - margin.top - margin.bottom;

  // 1분 단위로 데이터 집계 및 24시간 필터링
  const aggregatedData = useMemo(() => {
    if (!gpuInfo.length) return [];

    // 가장 최근 시간 찾기
    const latestTime = Math.max(
      ...gpuInfo.map((item) => new Date(item.time).getTime())
    );
    // 24시간 전 시간 계산 (24 * 60 * 60 * 1000 = 86400000ms)
    const twentyFourHoursAgo = latestTime - 24 * 60 * 60 * 1000;

    // 24시간 내 데이터만 필터링
    const filteredGpuInfo = gpuInfo.filter((item) => {
      const itemTime = new Date(item.time).getTime();
      return itemTime >= twentyFourHoursAgo;
    });

    const dataByMinute: Record<
      number,
      {
        time: number;
        temperatures: number[];
        utilizations: number[];
        memoryUsages: number[];
      }
    > = {};

    filteredGpuInfo.forEach((item) => {
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

  // 시간 간격이 큰 경우 선을 분리하기 위한 함수
  const createSegmentedData = (data: any, maxGapMinutes = 10) => {
    if (data.length < 2) return [data];

    const segments = [];
    let currentSegment = [data[0]];
    const maxGapMs = maxGapMinutes * 60 * 1000; // 10분을 밀리초로 변환

    for (let i = 1; i < data.length; i++) {
      const prevTime = data[i - 1].time.getTime();
      const currentTime = data[i].time.getTime();
      const gap = currentTime - prevTime;

      if (gap > maxGapMs) {
        // 간격이 너무 크면 현재 세그먼트를 저장하고 새로운 세그먼트 시작
        segments.push(currentSegment);
        currentSegment = [data[i]];
      } else {
        // 간격이 적절하면 현재 세그먼트에 추가
        currentSegment.push(data[i]);
      }
    }

    // 마지막 세그먼트 추가
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // 세그먼트화된 데이터 생성
  const segmentedData = useMemo(() => {
    return createSegmentedData(aggregatedData);
  }, [aggregatedData]);

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
    if (!aggregatedData.length) return scaleLinear({ range: [innerHeight, 0] });

    return scaleLinear({
      range: [innerHeight, 0],
      domain: [
        Math.min(...aggregatedData.map((d) => d.utilization)) - 5 < 0
          ? 0
          : Math.min(...aggregatedData.map((d) => d.utilization)) - 2,
        Math.max(...aggregatedData.map((d) => d.utilization)) + 2,
      ],
    });
  }, [aggregatedData, innerHeight]);

  // 접근자 함수들
  const getTime = (d: any) => d.time;
  const getTemperature = (d: any) => d.temperature;
  const getUtilization = (d: any) => d.utilization;

  if (!aggregatedData.length) {
    return (
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="GPU Monitoring (Last 24 hours)" />
        <div className="text-sm">
          No GPU data available in the last 24 hours
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <HeaderText text="GPU Monitoring (Last 24 hours)" />
      <div className="w-full h-full gap-4 flex flex-col">
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
                  fontSize: 12,
                  textAnchor: "start",
                  verticalAnchor: "middle",
                  dx: 6,
                })}
              />
            </Group>
          </svg>
          <div>
            <svg width={innerWidth + margin.left} height={height}>
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

                {/* 세그먼트별로 선 그리기 */}
                {segmentedData.map((segment, segmentIndex) => (
                  <LinePath
                    key={`temp-segment-${segmentIndex}`}
                    data={segment}
                    x={(d) => timeScale(getTime(d))}
                    y={(d) => tempScale(getTemperature(d))}
                    stroke="oklch(55.1% 0.027 264.364)"
                    strokeWidth={2}
                    curve={curveMonotoneX}
                  />
                ))}

                {aggregatedData.length > 0 &&
                  aggregatedData.map((d, i) => (
                    <Circle
                      key={i}
                      cx={timeScale(getTime(d))}
                      cy={tempScale(getTemperature(d))}
                      r={3}
                      fill="#bdbdbd"
                      stroke="#424242"
                    />
                  ))}

                <AxisBottom
                  top={innerHeight}
                  scale={timeScale}
                  numTicks={4}
                  tickFormat={(value) => {
                    const date = new Date(Number(value));
                    return `${date
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${date
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`;
                  }}
                  tickLength={6}
                  tickLabelProps={() => ({
                    fill: "oklch(55.1% 0.027 264.364)",
                    fontSize: 12,
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
                tickLength={4}
                tickLabelProps={() => ({
                  fill: "oklch(55.1% 0.027 264.364)",
                  fontSize: 12,
                  textAnchor: "start",
                  verticalAnchor: "middle",
                  dx: 6,
                })}
              />
            </Group>
          </svg>
          <div>
            <svg width={innerWidth + margin.left} height={height}>
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

                {segmentedData.map((segment, segmentIndex) => (
                  <LinePath
                    key={`util-segment-${segmentIndex}`}
                    data={segment}
                    x={(d) => timeScale(getTime(d))}
                    y={(d) => utilizationScale(getUtilization(d))}
                    stroke="oklch(55.1% 0.027 264.364)"
                    strokeWidth={2}
                    curve={curveMonotoneX}
                  />
                ))}

                {aggregatedData.length > 0 &&
                  aggregatedData.map((d, i) => (
                    <Circle
                      key={i}
                      cx={timeScale(getTime(d))}
                      cy={utilizationScale(getUtilization(d))}
                      r={3}
                      fill="#bdbdbd"
                      stroke="#424242"
                    />
                  ))}

                <AxisBottom
                  top={innerHeight}
                  scale={timeScale}
                  numTicks={4}
                  tickFormat={(value) => {
                    const date = new Date(Number(value));
                    return `${date
                      .getHours()
                      .toString()
                      .padStart(2, "0")}:${date
                      .getMinutes()
                      .toString()
                      .padStart(2, "0")}`;
                  }}
                  tickLength={6}
                  tickLabelProps={() => ({
                    fill: "#666",
                    fontSize: 12,
                    textAnchor: "middle",
                    verticalAnchor: "middle",
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

const GPUPlot = () => {
  return (
    <div className="w-full">
      <ParentSize>
        {({ width, height }) => <GPUPlotInner width={width} height={height} />}
      </ParentSize>
    </div>
  );
};

export default GPUPlot;
