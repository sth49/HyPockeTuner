import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import * as d3 from "d3";
import { useExperimentStore } from "../stores/experimentStore";
import { useColorSettingsStore } from "../stores/colorSettingsStore";

interface MetricRange {
  max: number;
  min: number;
}

interface Trial {
  metric?: number;
  loss?: number;
}

export const useColorScale = () => {
  const brackets = useExperimentStore((state) => state.brackets);
  const userTrials = useExperimentStore((state) => state.userTrials);
  const colorScheme = useColorSettingsStore((state) => state.getColorScheme());

  
  const allTrials = useMemo(() => {
    const trials: Trial[] = [];

    
    brackets.forEach((bracket) => {
      bracket.rounds.forEach((round) => {
        trials.push(...round.trials);
      });
    });

    
    trials.push(...userTrials);

    return trials
      .map((trial) => ({
        ...trial,
        metric: Number(trial.metric),
        loss: Number(trial.loss),
      }))
      .filter(
        (trial) =>
          trial.metric !== undefined &&
          trial.metric !== null &&
          trial.loss !== undefined &&
          trial.loss !== null &&
          trial.loss !== 999 &&
          !isNaN(trial.loss)
      );
  }, [brackets, userTrials]);

  
  const metric = useExperimentStore((state) => state.metric);
  const { metricRange, lossRange } = useMemo(() => {
    const metricRange: MetricRange = { max: 100, min: 0 };
    const lossRange: MetricRange = { max: 0, min: 100 };

    if (metric.range) {
      metricRange.min = metric.range[0];
      metricRange.max = metric.range[1];
    }
    allTrials.forEach((trial) => {
      if (
        trial.loss !== undefined &&
        trial.loss !== null &&
        trial.loss !== 999 &&
        trial.loss !== null
      ) {
        lossRange.max = Math.max(lossRange.max, trial.loss);
        lossRange.min = Math.min(lossRange.min, trial.loss);
      }
    });

    return { metricRange, lossRange };
  }, [allTrials, metric.range]);

  
  const metricScale = useMemo(() => {
    return scaleLinear<number>({
      range: [0, 1],
      domain: [metricRange.min, metricRange.max],
      clamp: true,
    });
  }, []);

  const lossScale = useMemo(() => {
    return scaleLinear<number>({
      range: [0, 1],
      domain: [lossRange.min, lossRange.max],
      clamp: true,
    });
  }, [lossRange.min, lossRange.max]);

  // const budgetScale = useMemo(() => {
  //   return scaleLinear<number>({
  //     range: [0, 1],
  
  //     clamp: true,
  //   });
  // }, []);

  // Color scales
  const colorScales = useMemo(() => {
    
    const metricColorScale = colorScheme.diverging
      .copy()
      .domain([0, 0.5, 1]); // 0: low, 0.5: mid, 1: high

    
    const lossColorScale = colorScheme.diverging
      .copy()
      .domain([1, 0.5, 0]); // 1: high (bad), 0.5: mid, 0: low (good)

    
    const budgetColorScale = colorScheme.sequential
      .copy()
      .domain([0, 1]); // 0 to 1 for budget visualization

    return { metricColorScale, lossColorScale, budgetColorScale };
  }, [colorScheme]);

  
  const calculateBrightness = (color: string): number => {
    const rgb = d3.rgb(color);
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 255000;
  };

  
  const getMetricColor = useMemo(() => {
    return (value: number | undefined | null = undefined) => {
      if (value === undefined || value === null) {
        return "ffffff";
      }
      return colorScales.metricColorScale(metricScale(value));
    };
  }, [colorScales, metricScale]);

  const getLossColor = useMemo(() => {
    return (value: number) => {
      return colorScales.lossColorScale(lossScale(value));
    };
  }, [colorScales, lossScale]);

  const getFontColor = useMemo(() => {
    return (value: number, type: "metric" | "loss" = "metric") => {
      if (!value && value !== 0) {
        return "oklch(55.1% 0.027 264.364)";
      }
      const color =
        type === "metric" ? getMetricColor(value) : getLossColor(value);

      const brightness = calculateBrightness(color);
      return brightness > 0.5 ? "black" : "white";
    };
  }, [getMetricColor, getLossColor]);

  return {
    metricScale,
    lossScale,
    metricColorScale: colorScales.metricColorScale,
    lossColorScale: colorScales.lossColorScale,
    getMetricColor,
    getLossColor,
    getFontColor,
    
    metricRange,
    lossRange,
  };
};
