import { Key, useState } from "react";
import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import SimpleBumpChart from "./BumpChart";
import { FaChevronDown } from "react-icons/fa6";

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
    position: "header" | "expanded",
    roundIndex: number = 0
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
        className={`flex items-center transition-all duration-800 ease-in-out ${
          position === "header"
            ? isExpanded
              ? "opacity-0 transform translate-y-8 scale-90"
              : "opacity-100 transform translate-y-0 scale-100"
            : isExpanded
            ? "opacity-100 transform translate-y-0 scale-100"
            : "opacity-0 transform -translate-y-8 scale-90"
        }`}
        style={{
          transitionDelay:
            position === "expanded"
              ? `${roundIndex * 100 + chunkIndex * 60}ms`
              : `${chunkIndex * 40}ms`,
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
              className={`w-[8px] h-[8px] flex items-center justify-center text-center border transition-all duration-600 ease-in-out ${
                trial.metric
                  ? " border-white border-[0.5px]"
                  : " border-gray-500"
              } ${
                position === "expanded" && isExpanded ? "hover:scale-125" : ""
              }`}
              style={{
                borderRadius: "30%",
                backgroundColor: trial.metric
                  ? getMetricColor(trial.metric)
                  : "transparent",
                transitionDelay:
                  position === "expanded"
                    ? `${
                        roundIndex * 100 +
                        chunkIndex * 60 +
                        (idx as number) * 20
                      }ms`
                    : `${chunkIndex * 40 + (idx as number) * 10}ms`,
                transform:
                  position === "header"
                    ? isExpanded
                      ? `translateY(20px) scale(0.9)`
                      : `translateY(0px) scale(1)`
                    : isExpanded
                    ? `translateY(0px) scale(1)`
                    : `translateY(-20px) scale(0.9)`,
              }}
            />
          )
        )}
      </div>
    ));
  };

  return (
    <div className="flex items-center bg-base-100 flex-col h-full">
      {data.length > 0 &&
        data.map((bracket, index) => {
          const numOfTrials = bracket.rounds.reduce(
            (acc, round) => acc + round.trials.length,
            0
          );
          const numOfRounds = bracket.rounds.length;
          const isExpanded = open.includes(bracket.id);

          return (
            <div key={index} className="w-full p-1">
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
                    className={`bg-white flex items-center justify-between p-2 transition-all duration-300 ${
                      isExpanded ? "shadow-md" : "hover:bg-gray-50"
                    }`}
                  >
                    <h2 className="text-lg w-[25%]">
                      Bracket {numOfBrackets - bracket.id}
                    </h2>
                    <div className="w-[65%] flex flex-col gap-1 relative overflow-hidden">
                      {/* 헤더 위치의 트라이얼들 */}
                      {bracket.rounds.length &&
                        bracket.rounds
                          .sort((a, b) => b.roundId - a.roundId)
                          .map((round, roundIndex) => (
                            <div
                              className="flex flex-col"
                              key={`header-${round.id}`}
                            >
                              {renderTrials(
                                round.trials,
                                isExpanded,
                                "header",
                                roundIndex
                              )}
                            </div>
                          ))}
                    </div>
                    <div className="w-[10%] flex items-center justify-center">
                      <div
                        className={`transition-transform duration-300 ${
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
                  className={`bg-white overflow-hidden transition-all duration-500 ease-in-out ${
                    isExpanded
                      ? "opacity-100 border-t border-gray-200"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <SimpleBumpChart
                    bracket={bracket.bracket}
                    width={numOfRounds * 100}
                    height={numOfTrials * 15 + 80}
                    isVisible={isExpanded}
                  />
                  {/* <div className="p-4">
                    {bracket.rounds.length &&
                      bracket.rounds
                        .sort((a, b) => b.roundId - a.roundId)
                        .map((round, roundIndex) => (
                          <div
                            className={`flex flex-col mb-6 transition-all duration-500 ease-out ${
                              isExpanded
                                ? "opacity-100 transform translateX(0)"
                                : "opacity-0 transform translateX(-20px)"
                            }`}
                            key={`expanded-${round.id}`}
                            style={{
                              transitionDelay: `${roundIndex * 150}ms`,
                            }}
                          >
                            <div className="mb-3">
                              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                Round {round.roundId}
                              </h3>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                {renderTrials(
                                  round.trials,
                                  isExpanded,
                                  "expanded",
                                  roundIndex
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                  </div> */}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default Brackets;
