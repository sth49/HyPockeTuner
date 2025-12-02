import { useMemo, useState, useEffect } from "react";
import { Group } from "@visx/group";
import { Circle, LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisRight } from "@visx/axis";
import { GridColumns, GridRows } from "@visx/grid";
import { curveMonotoneX } from "@visx/curve";
import { ParentSize } from "@visx/responsive";
import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";

// Hook to detect mobile screen size
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

// Function to sample data for mobile display
const sampleDataForMobile = (data: any[], maxPoints: number = 50) => {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

interface GPUPlotInnerProps {
  width: number;
  height: number;
}

const GPUPlotInner = ({ width: parentWidth }: GPUPlotInnerProps) => {
  const gpuInfo = useExperimentStore((state) => state.gpuInfo);
  const isMobile = useIsMobile();

  const chartWidth = parentWidth || 400;
  const height = isMobile ? 90 : 110;
  const margin = { top: 15, right: 40, bottom: 30, left: 10 };
  const legendWidth = 30;
  const innerWidth = chartWidth - margin.right - margin.left - legendWidth;
  const innerHeight = height - margin.top - margin.bottom;

  
  const aggregatedData = useMemo(() => {
    if (!gpuInfo.length) return [];

    
    const latestTime = Math.max(
      ...gpuInfo.map((item) => new Date(item.time).getTime())
    );
    
    const oneHourAgo = latestTime - 1 * 60 * 60 * 1000;

    
    const filteredGpuInfo = gpuInfo.filter((item) => {
      const itemTime = new Date(item.time).getTime();
      return itemTime >= oneHourAgo;
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

    
    const processedData = Object.values(dataByMinute)
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

    
    return isMobile ? sampleDataForMobile(processedData, 30) : processedData;
  }, [gpuInfo, isMobile]);

  
  const createSegmentedData = (data: any, maxGapMinutes = 10) => {
    if (data.length < 2) return [data];

    const segments = [];
    let currentSegment = [data[0]];
    const maxGapMs = maxGapMinutes * 60 * 1000;

    for (let i = 1; i < data.length; i++) {
      const prevTime = data[i - 1].time.getTime();
      const currentTime = data[i].time.getTime();
      const gap = currentTime - prevTime;

      if (gap > maxGapMs) {
        
        segments.push(currentSegment);
        currentSegment = [data[i]];
      } else {
        
        currentSegment.push(data[i]);
      }
    }

    
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  };

  
  const segmentedData = useMemo(() => {
    return createSegmentedData(aggregatedData);
  }, [aggregatedData]);

  
  const timeScale = useMemo(() => {
    if (!aggregatedData.length) return scaleTime({ range: [0, innerWidth] });

    return scaleTime({
      range: [0, innerWidth],
      domain: [
        Math.min(...aggregatedData.map((d) => d.time.getTime())) - 10000,
        Math.max(...aggregatedData.map((d) => d.time.getTime())) + 10000,
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

  
  const getTime = (d: any) => d.time;
  const getTemperature = (d: any) => d.temperature;
  const getUtilization = (d: any) => d.utilization;

  if (!aggregatedData.length) {
    return (
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="GPU Monitoring (Last 1 hour)" />
        <div className="text-sm">No GPU data available in the last 1 hour</div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <HeaderText text="GPU Monitoring (Last 1 hour)" />
      <div className="w-full h-full gap-4 flex flex-col">
        
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
                numTicks={isMobile ? 3 : 4}
                tickFormat={(value) => `${Math.round(Number(value))}°`}
                tickLabelProps={() => ({
                  fill: "#666",
                  fontSize: isMobile ? 10 : 12,
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
                  numTicks={
                    isMobile
                      ? Math.min(aggregatedData.length, 4)
                      : Math.min(aggregatedData.length, 10)
                  }
                />

                
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
                  numTicks={isMobile ? 3 : 4}
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
                    fontSize: isMobile ? 10 : 12,
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
                numTicks={isMobile ? 3 : 4}
                tickFormat={(value) => `${Math.round(Number(value))}%`}
                tickLength={4}
                tickLabelProps={() => ({
                  fill: "oklch(55.1% 0.027 264.364)",
                  fontSize: isMobile ? 10 : 12,
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
                  numTicks={
                    isMobile
                      ? Math.min(aggregatedData.length, 4)
                      : Math.min(aggregatedData.length, 10)
                  }
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
                  numTicks={isMobile ? 3 : 4}
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
