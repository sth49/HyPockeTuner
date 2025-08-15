import { useMemo, useState } from "react";
import { Group } from "@visx/group";
import { scaleLinear, scalePoint } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import { BracketState, TrialState } from "../../types/experiment";
import MobileDrawer from "../Timeline/MobileDrawer";
import NodeDetail from "../Timeline/NodeDetail";
import { BandProps } from "../Timeline/types";

interface BracketProps {
  bracket: BracketState;
  width?: number;
  height?: number;
}

interface BumpChartInnerProps extends BracketProps {
  width: number;
  height: number;
}

const BumpChartInner = ({ bracket, width, height }: BumpChartInnerProps) => {
  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const margin = { top: 50, right: 10, bottom: 20, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getMetricColor = useColorScale().getMetricColor;

  // MobileDrawer 상태 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BandProps | null>(null);
  const brackets = useExperimentStore((state) => state.brackets);

  // Trial 클릭 핸들러
  const handleTrialClick = (
    trial: TrialState & { roundId: number; position: number }
  ) => {
    const nodeData: BandProps = {
      type: "node",
      bracket: bracket.id,
      startTime: trial.startTime || 0,
      endTime: trial.endTime || 0,
      order: 0,
      data: {
        type: trial.type === "user" ? "user" : "trial",
        trials: [
          {
            ...trial,
            event: `Trial ${brackets.length - trial.bracketId}-${
              trial.roundId + 1
            }-${trial.trialId + 1}`, // 더 명확한 제목 추가
          },
        ],
      },
      prev: null,
      next: null,
    };

    setSelectedNode(nodeData);
    setDrawerOpen(true);
  };

  // 드로어 닫기 핸들러
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedNode(null);
  };

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
      // console;
      if (!round || !round.trials || !Array.isArray(round.trials)) {
        return;
      }

      roundIds.push(round.roundId + 1);

      // 성능순으로 정렬 (metric이 없는 경우 처리)
      const sortedTrials = round.trials
        // .filter((trial) => trial && typeof trial.metric === "number")
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
    console.log("Sorted Rounds: ", sortedRounds);

    const budgets = bracket.rounds.map((round) => {
      return round.budget || 0; // 라운드별 budget 사용
    });

    // sortedRounds.map((roundId) => {
    //   const roundTrials = allTrials.filter((t) => t.roundId === roundId);
    //   return roundTrials[0]?.budget || 0; // 첫 번째 트라이얼의 budget 사용
    // });

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
        <h2>No trials available for this bracket.</h2>
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
    <>
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height}>
          <Group left={margin.left} top={margin.top}>
            {/* 트라이얼 점들 */}
            {processedTrials.map((trial, i) => {
              const cx = xScale(trial.roundId);
              const cy = yScale(trial.position);
              if (cx == null || cy == null) {
                return null;
              }

              return (
                <g key={`trial-${trial.id || i}`}>
                  <rect
                    x={cx - 12}
                    y={cy - 6}
                    width={24}
                    height={8}
                    fill={
                      trial.metric
                        ? getMetricColor(trial.metric)
                        : "oklch(87.2% 0.01 258.338)"
                    }
                    stroke="oklch(87.2% 0.01 258.338)"
                    strokeWidth={1}
                    rx={3}
                    ry={3}
                    style={{
                      cursor: "pointer",
                      transition: "stroke-width 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute("stroke-width", "2");
                      e.currentTarget.setAttribute(
                        "stroke",
                        "oklch(55.1% 0.027 264.364)"
                      );
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.setAttribute("stroke-width", "1");
                      e.currentTarget.setAttribute(
                        "stroke",
                        "oklch(87.2% 0.01 258.338)"
                      );
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrialClick(trial);
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
              const pathData = `M${x1 + 12},${y1 - 2} C${(x1 + x2) / 2},${
                y1 - 2
              } ${(x1 + x2) / 2},${y2 - 2} ${x2 - 12},${y2 - 2}`;

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
                  />
                </g>
              );
            })}

            {/* 라운드 라벨 */}
            {rounds.map((round) => {
              const x = xScale(round);

              if (x == null) return null;

              return (
                <g key={`round-labels-${round}`}>
                  <text
                    x={x}
                    y={-35}
                    textAnchor="middle"
                    fontSize={"1em"}
                    fontWeight="bold"
                    fill="oklch(55.1% 0.027 264.364)"
                  >
                    R {round}
                  </text>
                  <text
                    x={x}
                    y={-20}
                    textAnchor="middle"
                    fontSize={"0.8em"}
                    fill="oklch(55.1% 0.027 264.364)"
                  >
                    ($ {budgets[round - 1] || 0})
                  </text>
                </g>
              );
            })}

            {/* 순위 레이블 */}
            {Array.from({ length: maxPosition + 1 }, (_, i) => {
              if (i % 10 === 0)
                return (
                  <text
                    key={`rank-${i}`}
                    x={5}
                    y={yScale(i) - 2}
                    textAnchor="end"
                    dy="0.35em"
                    fontSize={"0.8em"}
                    fill="oklch(55.1% 0.027 264.364)"
                  >
                    {i + 1}
                  </text>
                );
            })}
          </Group>
        </svg>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={handleCloseDrawer}>
        {selectedNode && selectedNode.type === "node" && selectedNode.data ? (
          <NodeDetail data={selectedNode} />
        ) : (
          <div className="text-center py-8">
            <p>Select a trial to view details</p>
          </div>
        )}
      </MobileDrawer>
    </>
  );
};

const BumpChart = ({ bracket, height = 400 }: BracketProps) => {
  return (
    <div className="w-full p-4">
      <ParentSize>
        {({ width: parentWidth }) => (
          <BumpChartInner
            bracket={bracket}
            width={parentWidth}
            height={height} // 높이는 props로 받은 값 사용
          />
        )}
      </ParentSize>
    </div>
  );
};

export default BumpChart;
