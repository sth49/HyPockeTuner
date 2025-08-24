import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import * as d3 from "d3";
import { useExperimentStore } from "../stores/experimentStore";

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

  // 모든 trials 수집
  const allTrials = useMemo(() => {
    const trials: Trial[] = [];

    // brackets에서 trials 수집
    brackets.forEach((bracket) => {
      bracket.rounds.forEach((round) => {
        trials.push(...round.trials);
      });
    });

    // userTrials 추가
    trials.push(...userTrials);

    return trials.filter(
      (trial) =>
        trial.metric !== undefined ||
        trial.loss !== 999 ||
        trial.loss !== undefined ||
        trial.metric !== null ||
        trial.loss !== null
    );
  }, [brackets, userTrials]);

  // metric과 loss의 범위 계산
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
        trial.loss !== 999
      ) {
        lossRange.max = Math.max(lossRange.max, trial.loss);
        lossRange.min = Math.min(lossRange.min, trial.loss);
      }
    });

    return { metricRange, lossRange };
  }, [allTrials, metric.range]);

  // Scale 생성
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
  //     domain: [0, 1], // 예시로 0에서 1 사이의 값에 대해 파란색 그라데이션
  //     clamp: true,
  //   });
  // }, []);

  // Color scales
  const colorScales = useMemo(() => {
    const metricColorScale = d3
      .scaleDiverging(d3.interpolateRdYlGn)
      .domain([0, 0.5, 1]); // 0: 빨간색, 0.5: 노란색, 1: 초록색

    const lossColorScale = d3
      .scaleDiverging(d3.interpolateRdYlGn)
      .domain([1, 0.5, 0]); // 1: 빨간색, 0.5: 노란색, 0: 초록색

    const budgetColorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, 1]); // 예시로 0에서 1 사이의 값에 대해 파란색 그라데이션

    return { metricColorScale, lossColorScale, budgetColorScale };
  }, []);

  // 색상 밝기 계산 헬퍼 함수
  const calculateBrightness = (color: string): number => {
    const rgb = d3.rgb(color);
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 255000;
  };

  // 색상 관련 함수들
  const getMetricColor = useMemo(() => {
    return (value: number | undefined | null = undefined) => {
      if (value === undefined || value === null) {
        return "ffffff"; // 기본 색상 (흰색)
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
        return "oklch(55.1% 0.027 264.364)"; // 기본 폰트 색상
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
    // 추가로 범위 정보도 제공
    metricRange,
    lossRange,
  };
};
