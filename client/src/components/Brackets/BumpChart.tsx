import React, { useMemo } from "react";
import { Group } from "@visx/group";
import { scaleLinear, scalePoint } from "@visx/scale";
import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import { BracketState, TrialState } from "../../types/experiment";

interface BracketProps {
  bracket: BracketState;
  width?: number;
  height?: number;
}

const SimpleBumpChart = ({
  bracket,
  width = 300,
  height = 400,
}: BracketProps) => {
  //   const brackets = useExperimentStore((state) => state.brackets);
  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const margin = { top: 50, right: 50, bottom: 10, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getMetricColor = useColorScale().getMetricColor;

  // 데이터 처리
  const { processedTrials, connections, rounds, budgets } = useMemo(() => {
    // 안전성 체크
    // if (!brackets || !Array.isArray(brackets) || brackets.length === 0) {
    //   return { processedTrials: [], connections: [], rounds: [] };
    // }

    // if (!bracket || !bracket.rounds || !Array.isArray(bracket.rounds)) {
    //   return { processedTrials: [], connections: [], rounds: [] };
    // }

    const allTrials: (TrialState & {
      roundId: number;
      position: number;
      x: number;
      y: number;
    })[] = [];
    const connections: {
      from: TrialState & { roundId: number; position: number };
      to: TrialState & { roundId: number; position: number };
    }[] = [];
    const roundIds: number[] = [];
    // 각 라운드별로 트라이얼 처리
    bracket.rounds.forEach((round) => {
      if (!round || !round.trials || !Array.isArray(round.trials)) {
        return;
      }

      roundIds.push(round.roundId + 1);

      // 성능순으로 정렬 (metric이 없는 경우 처리)
      const sortedTrials = round.trials
        .filter((trial) => trial && typeof trial.metric === "number")
        .sort((a, b) => {
          const metricA = typeof a.metric === "number" ? a.metric : -Infinity;
          const metricB = typeof b.metric === "number" ? b.metric : -Infinity;
          return metricB - metricA;
        });

      sortedTrials.forEach((trial, index) => {
        const processedTrial = {
          ...trial,
          roundId: round.roundId + 1,
          position: index,
          x: round.roundId,
          y: index,
        };
        allTrials.push(processedTrial);
      });
    });

    // 연결 관계 찾기 (samples 타입만)
    allTrials.forEach((trial) => {
      if (trial.sample === "samples" && trial.roundId > Math.min(...roundIds)) {
        // 이전 라운드에서 같은 파라미터를 가진 트라이얼 찾기
        const prevRoundTrials = allTrials.filter(
          (t) => t.roundId === trial.roundId - 1
        );

        const matchingTrial = prevRoundTrials.find((prev) => {
          // hyperparams가 없거나 빈 배열인 경우 처리
          if (
            !hyperparams ||
            !Array.isArray(hyperparams) ||
            hyperparams.length === 0
          ) {
            return false;
          }

          // params가 없는 경우 처리
          if (!prev.params || !trial.params) {
            return false;
          }

          return hyperparams.every((h) => {
            return prev.params[h.name] === trial.params[h.name];
          });
        });

        if (matchingTrial) {
          connections.push({
            from: matchingTrial,
            to: trial,
          });
        }
      }
    });

    // 라운드 ID 정렬
    const sortedRounds = [...new Set(roundIds)].sort((a, b) => a - b);

    const budgets = sortedRounds.map((roundId) => {
      const roundTrials = allTrials.filter((t) => t.roundId === roundId);
      return roundTrials[0]?.budget || 0; // 첫 번째 트라이얼의 budget 사용
    });

    return {
      processedTrials: allTrials,
      connections,
      rounds: sortedRounds,
      budgets,
    };
  }, [bracket, hyperparams]);

  // 데이터가 없는 경우 처리
  if (!processedTrials || processedTrials.length === 0) {
    return (
      <div className="w-full p-4">
        <h2 className="text-xl font-bold mb-4">BOHB Trial Flow (Bump Chart)</h2>
        {/* <div className="text-center text-gray-500 py-8">
          <p>데이터가 없습니다.</p>
          <p className="text-sm mt-2">
            브래킷과 트라이얼 데이터를 확인해주세요.
          </p>
        </div> */}
      </div>
    );
  }

  // 스케일 설정
  const maxPosition = Math.max(...processedTrials.map((t) => t.position));

  const xScale = scalePoint({
    domain: rounds,
    range: [0, innerWidth],
    padding: 0.3,
  });

  const yScale = scaleLinear({
    domain: [0, maxPosition],
    range: [0, innerHeight],
  });

  return (
    <div className="w-full">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* 연결선 */}
          {connections.map((conn, i) => {
            const x1 = xScale(conn.from.roundId);
            const y1 = yScale(conn.from.position);
            const x2 = xScale(conn.to.roundId);
            const y2 = yScale(conn.to.position);

            // null 체크
            if (x1 == null || y1 == null || x2 == null || y2 == null) {
              return null;
            }

            return (
              <line
                key={`line-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="oklch(55.1% 0.027 264.364)"
                strokeWidth={2}
                strokeOpacity={0.5}
              />
            );
          })}

          {/* 트라이얼 점들 */}
          {processedTrials.map((trial, i) => {
            const cx = xScale(trial.roundId);
            const cy = yScale(trial.position);

            // null 체크
            if (cx == null || cy == null) {
              return null;
            }

            return (
              <g key={`trial-${trial.id || i}`}>
                <rect
                  x={cx - 6}
                  y={cy - 6}
                  width={12}
                  height={12}
                  fill={getMetricColor(trial.metric)}
                  stroke="white"
                  strokeWidth={2}
                  rx={3}
                  ry={3}
                />
              </g>
            );
          })}

          {/* 라운드 레이블 */}
          {rounds.map((round) => {
            const x = xScale(round);
            if (x == null) return null;

            return (
              <>
                <text
                  key={`round-${round}`}
                  x={x}
                  y={-35}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight="bold"
                  fill="oklch(55.1% 0.027 264.364)"
                >
                  Round {round}
                </text>
                <text
                  key={`round-${round}-text`}
                  x={x}
                  y={-20}
                  textAnchor="middle"
                  fontSize={12}
                  // fontWeight="bold"
                  fill="oklch(55.1% 0.027 264.364)"
                >
                  (${budgets[round - 1] || 0})
                </text>
              </>
            );
          })}

          {/* 순위 레이블 */}
          {Array.from({ length: maxPosition + 1 }, (_, i) => (
            <text
              key={`rank-${i}`}
              x={-20}
              y={yScale(i)}
              textAnchor="end"
              dy="0.35em"
              fontSize={12}
              fill="oklch(55.1% 0.027 264.364)"
            >
              {i + 1}
            </text>
          ))}
        </Group>
      </svg>

      {/* 상세 정보 테이블 */}
      {/* <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">Trial ID</th>
              <th className="border border-gray-300 px-2 py-1">Round</th>
              <th className="border border-gray-300 px-2 py-1">Rank</th>
              <th className="border border-gray-300 px-2 py-1">Sample Type</th>
              <th className="border border-gray-300 px-2 py-1">Metric</th>
            </tr>
          </thead>
          <tbody>
            {processedTrials
              .sort((a, b) => a.roundId - b.roundId || a.position - b.position)
              .map((trial, index) => (
                <tr key={trial.id || index}>
                  <td className="border border-gray-300 px-2 py-1 font-mono">
                    {trial.id || `Trial-${index}`}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {trial.roundId}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    #{trial.position + 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-1"
                      style={{ backgroundColor: getColor(trial.sample) }}
                    ></span>
                    {trial.sample || "unknown"}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {trial.metric ? trial.metric.toFixed(3) : "N/A"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div> */}
    </div>
  );
};

export default SimpleBumpChart;
