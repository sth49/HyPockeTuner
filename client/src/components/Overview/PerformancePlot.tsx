import { useMemo } from "react";
import HeaderText from "../common/HeaderText";
import { useExperimentStore } from "../../stores/experimentStore";
import { ParentSize } from "@visx/responsive";
import * as d3 from "d3";
import { formatting, useColorScale } from "../../utils";
import { GlyphStar } from "@visx/glyph";
import { LinePath } from "@visx/shape";
import { scaleTime } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
interface PerformancePlotInnerProps {
  width: number;
  height: number;
}

const PerformancePlotInner = ({
  width: parentWidth,
}: PerformancePlotInnerProps) => {
  const brackets = useExperimentStore((state) => state.brackets);
  const userTrials = useExperimentStore((state) => state.userTrials);

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

    return {
      algorithmTrials,
      userTrialData,
      combinedData,
      bestTrialsOverTime,
      bestTrial,
    };
  }, [brackets, userTrials]);

  // Chart dimensions
  const width = parentWidth || 300;
  const height = 120;
  const margin = { top: 15, right: 30, bottom: 30, left: 10 };
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
  return (
    <svg width={width} height={height}>
      {/* Chart area */}
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Grid lines */}
        <g className="grid">
          {/* Vertical grid lines */}
          {xScale
            .ticks(Math.min(6, Math.floor(innerWidth / 80)))
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
          {yScale.ticks(5).map((tick, i) => (
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
        <g>
          <line
            x1={innerWidth}
            y1={0}
            x2={innerWidth}
            y2={innerHeight}
            stroke="#374151"
            strokeWidth={1}
          />
          {yScale.ticks(5).map((tick, i) => (
            <g
              key={`y-tick-${i}`}
              transform={`translate(${innerWidth}, ${yScale(tick)})`}
            >
              <line x1={6} x2={0} stroke="#374151" strokeWidth={1} />
              <text
                x={30}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                // fill="#374151"

                fill="oklch(55.1% 0.027 264.364)"
              >
                {tick}
              </text>
            </g>
          ))}
        </g>

        {bestTrial && typeof bestTrial.metric === "number" && (
          <g>
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
            <text
              x={innerWidth - 5}
              y={yScale(bestTrial.metric) - 5}
              textAnchor="end"
              fontSize={12}
              // fill="#10b981"
              fill={
                getMetricColor(bestTrial.metric) || "oklch(55.1% 0.027 264.364)"
              }
              fontWeight="600"
            >
              Best {metric.name}: {formatting(bestTrial.metric, "float", 2)}
            </text>
          </g>
        )}

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
            opacity={0.7}
          />
        ))}
        {userTrialData.map((trial) => (
          <circle
            key={`user-${trial.id}`}
            cx={xScale(trial.time)}
            cy={yScale(trial.metric ?? 0)}
            r={4}
            fill="#bdbdbd"
            stroke="#424242"
            strokeWidth={2}
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
            size={50}
            fill="oklch(85.486% 0.089 84.093)"
            stroke="oklch(55.1% 0.027 264.364)"
          />
        ))}
        {/* X Axis */}
        <AxisBottom
          top={innerHeight}
          scale={xScale}
          numTicks={4}
          tickFormat={(value) => {
            const date = new Date(Number(value));
            return `${date.getHours().toString().padStart(2, "0")}:${date
              .getMinutes()
              .toString()
              .padStart(2, "0")}`;
          }}
          tickLabelProps={() => ({
            fill: "oklch(55.1% 0.027 264.364)",
            fontSize: 13,
            textAnchor: "middle",
            verticalAnchor: "middle",
            tickLength: 4,
          })}
        />
      </g>
    </svg>
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
      <div className="w-full ">
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
