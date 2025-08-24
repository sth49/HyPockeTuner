import { useMemo, useState, useEffect } from "react";
import HeaderText from "../common/HeaderText";
import { useExperimentStore } from "../../stores/experimentStore";
import { ParentSize } from "@visx/responsive";
import * as d3 from "d3";
import { formatting, useColorScale } from "../../utils";
import { GlyphStar } from "@visx/glyph";
import { LinePath } from "@visx/shape";
import { scaleTime } from "@visx/scale";
import { AxisBottom } from "@visx/axis";

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

  // Always include best trials and recent trials
  const sortedByMetric = [...data].sort(
    (a, b) => (b.metric || 0) - (a.metric || 0)
  );
  const sortedByTime = [...data].sort((a, b) => b.time - a.time);

  const topTrials = sortedByMetric.slice(0, Math.floor(maxPoints * 0.3)); // Top 30%
  const recentTrials = sortedByTime.slice(0, Math.floor(maxPoints * 0.3)); // Recent 30%

  // Sample remaining points evenly across the timeline
  const remaining = data.filter(
    (d) =>
      !topTrials.some((t) => t.id === d.id) &&
      !recentTrials.some((t) => t.id === d.id)
  );

  const step = Math.ceil(
    remaining.length / (maxPoints - topTrials.length - recentTrials.length)
  );
  const sampledRemaining = remaining.filter((_, index) => index % step === 0);

  return [...topTrials, ...recentTrials, ...sampledRemaining].filter(
    (item, index, self) => self.findIndex((t) => t.id === item.id) === index
  ); // Remove duplicates
};
interface PerformancePlotInnerProps {
  width: number;
  height: number;
}

const PerformancePlotInner = ({
  width: parentWidth,
}: PerformancePlotInnerProps) => {
  const brackets = useExperimentStore((state) => state.brackets);
  const userTrials = useExperimentStore((state) => state.userTrials);
  const isMobile = useIsMobile();

  const {
    algorithmTrials,
    userTrialData,
    combinedData,
    bestTrialsOverTime,
    bestTrial,
  } = useMemo(() => {
    if (!brackets || !userTrials)
      return {
        algorithmTrials: [],
        userTrialData: [],
        combinedData: [],
        bestTrialsOverTime: [],
        bestTrial: null,
      };

    // Algorithm trials from brackets
    const algorithmTrials = brackets
      .map((bracket) =>
        bracket.rounds.map((round) =>
          round.trials.map((trial) => {
            if (trial.endTime === -1 || trial.metric === null) {
              return null;
            }
            return {
              id: trial.id,
              loss: trial.loss,
              metric: trial.metric,
              time: trial.endTime,
              type: "algorithm",
            };
          })
        )
      )
      .flat(2)
      .filter((trial) => trial !== null);

    // User trials
    const userTrialData = userTrials
      .map((trial) => {
        if (trial.endTime === -1) {
          return null;
        }
        return {
          id: trial.id,
          loss: trial.loss,
          metric: trial.metric,
          time: trial.endTime,
          type: "user",
        };
      })
      .filter((trial) => trial !== null);

    const combinedData = [...algorithmTrials, ...userTrialData];

    // Sort by time and find best trials over time
    const sortedData = combinedData.sort((a, b) => a.time - b.time);
    const bestTrialsOverTime: {
      id: string;
      loss: number | undefined;
      metric: number | undefined;
      time: number;
      type: string;
    }[] = [];
    let currentBest = -Infinity;

    sortedData.forEach((trial) => {
      if (typeof trial.metric === "number" && trial.metric > currentBest) {
        currentBest = trial.metric;
        bestTrialsOverTime.push(trial);
      }
    });

    // Find the overall best trial
    const bestTrial = combinedData.reduce<{
      id: string;
      loss: number | undefined;
      metric: number | undefined;
      time: number;
      type: string;
    } | null>((best, trial) => {
      if (
        typeof trial.metric === "number" &&
        (best === null ||
          (typeof best.metric === "number" && trial.metric > best.metric))
      ) {
        return trial;
      }
      return best;
    }, null);

    // Apply mobile sampling if needed
    const finalAlgorithmTrials = isMobile
      ? sampleDataForMobile(algorithmTrials, 30)
      : algorithmTrials;
    const finalUserTrialData = isMobile
      ? sampleDataForMobile(userTrialData, 20)
      : userTrialData;
    const finalCombinedData = [...finalAlgorithmTrials, ...finalUserTrialData];

    return {
      algorithmTrials: finalAlgorithmTrials,
      userTrialData: finalUserTrialData,
      combinedData: finalCombinedData,
      bestTrialsOverTime,
      bestTrial,
    };
  }, [brackets, userTrials, isMobile]);

  // Chart dimensions - responsive for mobile with horizontal scroll support
  const containerWidth = parentWidth || 300;
  const height = isMobile ? 100 : 120;
  const margin = isMobile
    ? { top: 10, right: 40, bottom: 25, left: 10 }
    : { top: 15, right: 50, bottom: 30, left: 10 };

  // Calculate minimum width based on data points to enable horizontal scrolling
  const minDataPoints = Math.max(combinedData.length, 10);
  const pointSpacing = isMobile ? 15 : 20; // Minimum spacing between points
  const calculatedWidth = Math.max(
    containerWidth,
    minDataPoints * pointSpacing + margin.left + margin.right
  );
  const width = calculatedWidth;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  // const xScale = useMemo(() => {
  //   if (combinedData.length === 0) return d3.scaleLinear();
  //   const timeExtent = d3.extent(combinedData, (d) => d.time);
  //   if (timeExtent[0] === undefined || timeExtent[1] === undefined) {
  //     return d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
  //   }
  //   return d3
  //     .scaleLinear()
  //     .domain([timeExtent[0], timeExtent[1]])
  //     .range([0, innerWidth]);
  // }, [combinedData, innerWidth]);

  const xScale = useMemo(() => {
    if (combinedData.length === 0) return d3.scaleTime();
    return scaleTime({
      domain: [
        Math.min(...combinedData.map((d) => d.time)) - 10000,
        Math.max(...combinedData.map((d) => d.time)) + 10000,
      ] as [number, number],
      range: [0, innerWidth],
    });
  }, [combinedData, innerWidth]);

  const yScale = useMemo(() => {
    if (combinedData.length === 0) return d3.scaleLinear();
    const metricExtent = d3.extent(combinedData, (d) => d.metric);
    if (metricExtent[0] === undefined || metricExtent[1] === undefined) {
      return d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
    }
    // Add some padding to the y scale
    const padding = (metricExtent[1] - metricExtent[0]) * 0.1;
    return d3
      .scaleLinear()
      .domain([metricExtent[0] - padding, metricExtent[1] + padding])
      .range([innerHeight, 0]);
  }, [combinedData, innerHeight]);

  // const line = d3
  //   .line()
  //   .x((d) => xScale(d.time))
  //   .y((d) => yScale(d.metric))
  //   .curve(d3.curveMonotoneX);

  // const pathData =
  //   bestTrialsOverTime.length > 1
  //     ? line(
  //         bestTrialsOverTime
  //           .filter(
  //             (trial): trial is typeof trial & { metric: number } =>
  //               typeof trial.metric === "number"
  //           )
  //           .map((trial) => [trial.time, trial.metric] as [number, number])
  //       )
  //     : "";
  const metric = useExperimentStore((state) => state.metric);

  const { getMetricColor } = useColorScale();

  // Show "no data" message if there's no data
  if (combinedData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">No performance data available</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Floating best trial text */}
      {bestTrial && typeof bestTrial.metric === "number" && (
        <div
          className="absolute z-20 pointer-events-none "
          style={{
            top: `${margin.top + yScale(bestTrial.metric) - 15}px`,
            right: `${margin.right + 10}px`,
            color:
              getMetricColor(bestTrial.metric) || "oklch(55.1% 0.027 264.364)",
            fontSize: isMobile ? "9px" : "12px",
            fontWeight: "600",
          }}
        >
          {isMobile
            ? `Best: ${formatting(bestTrial.metric, "float", 2)}`
            : `Best ${metric.name}: ${formatting(
                bestTrial.metric,
                "float",
                2
              )}`}
        </div>
      )}

      {/* Fixed Y-axis overlay */}
      <div className="absolute top-0 right-0 z-10 pointer-events-none bg-white">
        <svg width={margin.right} height={height}>
          {/* Background for Y-axis area */}
          <rect x={0} y={0} width={margin.right} height={height} fill="white" />
          <g transform={`translate(0, ${margin.top})`}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              stroke="#374151"
              strokeWidth={1}
            />
            {yScale.ticks(isMobile ? 3 : 5).map((tick, i) => (
              <g
                key={`y-tick-${i}`}
                transform={`translate(0, ${yScale(tick)})`}
              >
                <line x1={6} x2={0} stroke="#374151" strokeWidth={1} />
                <text
                  x={isMobile ? 35 : 45}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={isMobile ? 11 : 13}
                  fill="oklch(55.1% 0.027 264.364)"
                >
                  {tick}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Scrollable chart area */}
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height}>
          {/* Chart area */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            
            {/* Best line - behind all data points */}
            {bestTrial && typeof bestTrial.metric === "number" && (
              <line
                x1={0}
                y1={yScale(bestTrial.metric)}
                x2={innerWidth}
                y2={yScale(bestTrial.metric)}
                stroke={
                  getMetricColor(bestTrial.metric) || "oklch(55.1% 0.027 264.364)"
                }
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.6}
              />
            )}
            
            {/* Grid lines */}
            <g className="grid">
              {/* Vertical grid lines */}
              {xScale
                .ticks(
                  isMobile
                    ? Math.min(3, Math.floor(innerWidth / 100))
                    : Math.min(6, Math.floor(innerWidth / 80))
                )
                .map((tick, i) => (
                  <line
                    key={`v-grid-${i}`}
                    x1={xScale(tick)}
                    y1={0}
                    x2={xScale(tick)}
                    y2={innerHeight}
                    // stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                ))}
              {/* Horizontal grid lines */}
              {yScale.ticks(isMobile ? 3 : 5).map((tick, i) => (
                <line
                  key={`h-grid-${i}`}
                  x1={0}
                  y1={yScale(tick)}
                  x2={innerWidth}
                  y2={yScale(tick)}
                  //   stroke="#f3f4f6"
                  strokeWidth={1}
                />
              ))}
            </g>

            {algorithmTrials.map((trial) => (
              <circle
                key={`algo-${trial.id}`}
                cx={xScale(trial.time)}
                cy={yScale(trial.metric ?? 0)}
                r={3}
                // fill="oklch(55.1% 0.027 264.364)"
                fill="#bdbdbd"
                stroke="#424242"
                strokeWidth={1}
              />
            ))}
            {userTrialData.map((trial) => (
              <circle
                key={`user-${trial.id}`}
                cx={xScale(trial.time)}
                cy={yScale(trial.metric ?? 0)}
                r={3}
                fill="#bdbdbd"
                stroke="#424242"
                strokeWidth={isMobile ? 1 : 2}
                opacity={0.8}
              />
            ))}
            <LinePath<{
              id: string;
              loss: number | undefined;
              metric: number | undefined;
              time: number;
              type: string;
            }>
              data={bestTrialsOverTime}
              x={(d) => xScale(d.time)}
              y={(d) => yScale(d.metric ?? 0)}
              stroke="oklch(55.1% 0.027 264.364)"
              strokeWidth={2}
            />
            {bestTrialsOverTime.map((trial) => (
              <GlyphStar
                key={`best-${trial.id}`}
                left={xScale(trial.time)}
                top={yScale(trial.metric ?? 0)}
                size={isMobile ? 30 : 50}
                fill="oklch(85.486% 0.089 84.093)"
                stroke="oklch(55.1% 0.027 264.364)"
              />
            ))}
            {/* X Axis */}
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              numTicks={Math.min(
                Math.max(Math.floor(combinedData.length / 5), 3),
                isMobile ? 8 : 12
              )}
              tickFormat={(value) => {
                const date = new Date(Number(value));
                return `${date.getHours().toString().padStart(2, "0")}:${date
                  .getMinutes()
                  .toString()
                  .padStart(2, "0")}`;
              }}
              tickLabelProps={() => ({
                fill: "oklch(55.1% 0.027 264.364)",
                fontSize: isMobile ? 10 : 13,
                textAnchor: "middle",
                verticalAnchor: "middle",
                tickLength: 4,
              })}
            />
          </g>
        </svg>
      </div>

    </div>
  );
};

const PerformancePlot = () => {
  return (
    <div className="w-full flex gap-1.5 flex-col bg-white p-4">
      <div className="flex items-center justify-between">
        <HeaderText text="Performance" />
        <div className="flex items-center">
          <svg width="28" height="28" fill="none">
            <GlyphStar
              left={14}
              top={14}
              fill="oklch(85.486% 0.089 84.093)"
              stroke="oklch(55.1% 0.027 264.364)"
              size={50}
            />
          </svg>
          <p className="text-xs text-oklch(55.1% 0.027 264.364) ">Improver</p>
        </div>
      </div>
      <div className="w-full">
        <ParentSize>
          {({ width, height }) => (
            <PerformancePlotInner width={width} height={height} />
          )}
        </ParentSize>
      </div>
    </div>
  );
};

export default PerformancePlot;
