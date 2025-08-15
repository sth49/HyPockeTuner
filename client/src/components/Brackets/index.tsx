import { Key, useState } from "react";
import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import BumpChart from "./BumpChart";
import { FaChevronDown } from "react-icons/fa6";
import Legend from "../common/Legend";

const Brackets = () => {
  const brackets = useExperimentStore((state) => state.brackets);
  const numOfBrackets = brackets.length;
  const getMetricColor = useColorScale().getMetricColor;

  const data = brackets
    .map((bracket) => {
      return {
        id: bracket.id,
        bracket: bracket,
        rounds: bracket.rounds.map((round) => ({
          id: round.id,
          roundId: round.roundId,
          trials: round.trials.map((trial) => ({
            id: trial.id,
            metric: trial.metric,
          })),
        })),
      };
    })
    .sort((a, b) => a.id - b.id);

  const chunkArray = (array: any[], chunkSize: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const [open, setOpen] = useState<number[]>([]);

  // 트라이얼 렌더링 함수 - 위치에 따라 다른 스타일 적용
  const renderTrials = (
    trials: any[],
    isExpanded: boolean,
    position: "header" | "expanded"
  ) => {
    const sortedTrials = trials.slice().sort((a, b) => {
      if (a.metric === null) return 1;
      if (b.metric === null) return -1;
      return (b.metric ?? 0) - (a.metric ?? 0);
    });
    const chunks = chunkArray(sortedTrials, 27);

    return chunks.map((chunk, chunkIndex) => (
      <div
        key={`${position}-${chunkIndex}`}
        className={`flex items-center w-full`}
        style={{
          visibility: isExpanded ? "hidden" : "visible",
        }}
      >
        {chunk.map(
          (
            trial: {
              metric: number | null | undefined;
            },
            idx: Key | null | undefined
          ) => (
            <div
              key={`${position}-${idx}`}
              className={`w-[8px] h-[8px] flex items-center justify-center bg-gray-300 text-center border border-white border-[0.5px] `}
              style={{
                borderRadius: "30%",
                backgroundColor: trial.metric
                  ? getMetricColor(trial.metric)
                  : "",
              }}
            />
          )
        )}
      </div>
    ));
  };

  return (
    <div className="flex items-center bg-base-100 flex-col h-full gap-1 relative">
      <div className="bg-base-100 w-full flex justify-center py-1 absolute top-0 z-10">
        <Legend width={200} />
      </div>
      <div
        className="w-full h-full overflow-y-auto flex flex-col gap-2 p-2"
        style={{ paddingTop: "30px" }}
      >
        {data.length > 0 &&
          data.map((bracket, index) => {
            const numOfTrials = bracket.rounds.reduce(
              (acc, round) => acc + round.trials.length,
              0
            );
            const isExpanded = open.includes(bracket.id);

            return (
              <div key={index} className="w-full">
                <div className="relative">
                  <div
                    onClick={() => {
                      if (open.includes(bracket.id)) {
                        setOpen(open.filter((id) => id !== bracket.id));
                      } else {
                        setOpen([...open, bracket.id]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={`bg-white flex items-center justify-between p-2`}
                    >
                      <h2 className="text-lg w-[25%] font-semibold">
                        Bracket {numOfBrackets - bracket.id}
                      </h2>
                      <div className="w-[65%] flex flex-col gap-1 relative overflow-hidden">
                        {/* 헤더 위치의 트라이얼들 */}
                        {bracket.rounds.length &&
                          bracket.rounds
                            .sort((a, b) => b.roundId - a.roundId)
                            .map((round) => (
                              <div
                                className="flex flex-col"
                                key={`header-${round.id}`}
                              >
                                {renderTrials(
                                  round.trials,
                                  isExpanded,
                                  "header"
                                )}
                              </div>
                            ))}
                      </div>
                      <div className="w-[10%] flex items-center justify-center">
                        <div
                          className={` ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}
                        >
                          <FaChevronDown />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 확장된 영역 */}
                  <div
                    className={`bg-white overflow-hidden  ${
                      isExpanded ? "border-t border-gray-200" : "max-h-0"
                    }`}
                  >
                    <BumpChart
                      bracket={bracket.bracket}
                      height={numOfTrials * 8 + 80}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Brackets;
