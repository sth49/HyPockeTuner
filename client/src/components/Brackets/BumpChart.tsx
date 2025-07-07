import { useMemo, useState, useEffect } from "react";
import { Group } from "@visx/group";
import { scaleLinear, scalePoint } from "@visx/scale";
import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import { BracketState, TrialState } from "../../types/experiment";

interface BracketProps {
  bracket: BracketState;
  width?: number;
  height?: number;
  isVisible?: boolean;
}

const SimpleBumpChart = ({
  bracket,
  width = 300,
  height = 400,
  isVisible = true,
}: BracketProps) => {
  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const margin = { top: 60, right: 10, bottom: 20, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getMetricColor = useColorScale().getMetricColor;

  // 애니메이션 상태
  const [visibleRounds, setVisibleRounds] = useState<Set<number>>(new Set());
  const [showConnections, setShowConnections] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);

  // 데이터 처리
  const { processedTrials, connections, rounds, budgets } = useMemo(() => {
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

  // 애니메이션 시작
  useEffect(() => {
    if (processedTrials.length > 0 && isVisible) {
      // isVisible이 true가 될 때마다 애니메이션 리셋 후 시작
      setAnimationStarted(false);
      setVisibleRounds(new Set());
      setShowConnections(false);

      // 약간의 지연 후 애니메이션 시작
      setTimeout(() => {
        setAnimationStarted(true);

        // 라운드별로 순차적으로 애니메이션
        rounds.forEach((round, index) => {
          setTimeout(() => {
            setVisibleRounds((prev) => new Set([...prev, round]));

            // 마지막 라운드가 나타난 후 연결선 애니메이션 시작
            if (index === rounds.length - 1) {
              setTimeout(() => {
                setShowConnections(true);
              }, 300); // 마지막 점들이 완전히 나타난 후
            }
          }, index * 500); // 각 라운드마다 500ms 간격
        });
      }, 100);
    } else if (!isVisible) {
      // isVisible이 false가 되면 애니메이션 상태 리셋
      setAnimationStarted(false);
      setVisibleRounds(new Set());
      setShowConnections(false);
    }
  }, [processedTrials, rounds, isVisible]);

  // bracket이 변경되면 애니메이션 리셋
  useEffect(() => {
    if (!isVisible) {
      setAnimationStarted(false);
      setVisibleRounds(new Set());
      setShowConnections(false);
    }
  }, [bracket, isVisible]);

  // 데이터가 없는 경우 처리
  if (!processedTrials || processedTrials.length === 0) {
    return (
      <div className="w-full p-4">
        <h2 className="text-xl font-bold ">
          No trials available for this bracket.
        </h2>
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
    <div className="w-full p-4 overflow-x-auto">
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {/* 트라이얼 점들 */}
          {processedTrials.map((trial, i) => {
            const cx = xScale(trial.roundId);
            const cy = yScale(trial.position);
            const isVisible = visibleRounds.has(trial.roundId);
            const isConnected = connections.some(
              (conn) =>
                (conn.from.roundId === trial.roundId &&
                  conn.from.position === trial.position) ||
                (conn.to.roundId === trial.roundId &&
                  conn.to.position === trial.position)
            );

            // null 체크
            if (cx == null || cy == null) {
              return null;
            }

            return (
              <g key={`trial-${trial.id || i}`}>
                <rect
                  x={cx - 12}
                  y={cy - 6}
                  width={24}
                  height={10}
                  fill={getMetricColor(trial.metric)}
                  strokeWidth={2}
                  rx={3}
                  ry={3}
                  style={{
                    opacity: isVisible ? (isConnected ? 1 : 0.5) : 0,
                    transform: isVisible ? "scale(1)" : "scale(0)",
                    transformOrigin: "center",
                    transition: "all 0.3s ease-out",
                    transitionDelay: `${trial.position * 30}ms`, // 각 점마다 순차적으로
                  }}
                />
              </g>
            );
          })}

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

            const pathId = `connection-path-${i}`;
            const pathData = `M${x1 + 12},${y1} C${(x1 + x2) / 2},${y1} ${
              (x1 + x2) / 2
            },${y2} ${x2 - 12},${y2}`;

            return (
              <g key={`connection-${i}`}>
                {/* 경로 정의 */}
                <defs>
                  <path id={pathId} d={pathData} />
                </defs>

                {/* 연결선 */}
                <path
                  d={pathData}
                  stroke="oklch(55.1% 0.027 264.364)"
                  strokeWidth={2}
                  fill="none"
                  strokeOpacity={0.5}
                  style={{
                    strokeDasharray: showConnections ? "none" : "1000",
                    strokeDashoffset: showConnections ? "0" : "1000",
                    transition: "stroke-dashoffset 0.8s ease-in-out",
                    transitionDelay: `${i * 100}ms`, // 각 연결선마다 순차적으로
                  }}
                />
              </g>
            );
          })}

          {/* 라운드 라벨 */}
          {rounds.map((round) => {
            const x = xScale(round);
            const isVisible = visibleRounds.has(round);

            if (x == null) return null;

            return (
              <g key={`round-labels-${round}`}>
                <text
                  x={x}
                  y={-35}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight="bold"
                  fill="oklch(55.1% 0.027 264.364)"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? "translateY(0)"
                      : "translateY(-10px)",
                    transition: "all 0.3s ease-out",
                    transitionDelay: "0.1s",
                  }}
                >
                  Round {round}
                </text>
                <text
                  x={x}
                  y={-20}
                  textAnchor="middle"
                  fontSize={12}
                  fill="oklch(55.1% 0.027 264.364)"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible
                      ? "translateY(0)"
                      : "translateY(-10px)",
                    transition: "all 0.3s ease-out",
                    transitionDelay: "0.2s",
                  }}
                >
                  ($ {budgets[round - 1] || 0})
                </text>
              </g>
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
              style={{
                opacity: animationStarted ? 1 : 0,
                transition: "opacity 0.3s ease-out",
                transitionDelay: "0.1s",
              }}
            >
              {i + 1}
            </text>
          ))}
        </Group>
      </svg>
    </div>
  );
};

export default SimpleBumpChart;
