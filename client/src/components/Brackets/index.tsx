import { useExperimentStore } from "../../stores/experimentStore";
import { useColorScale } from "../../utils/colorScale";
import SimpleBumpChart from "./BumpChart";

// const Brackets = () => {
//   //   const numOfBrackets = brackets.length;
//   const brackets = useExperimentStore((state) => state.brackets);
//   const numOfBrackets = brackets.length;

//   const getMetricColor = useColorScale().getMetricColor;
//   return (
//     <div className="flex items-center justify-center bg-red-50 flex-col ">
//       {brackets.length > 0 &&
//         brackets
//           .sort((a, b) => a.id - b.id)
//           .map((bracket, index) => {
//             return (
//               <div
//                 key={index}
//                 className="w-full gap-4 p-2 bg-white rounded-lg mb-4 collapse"
//               >
//                 <div className="w-full flex items-center justify-center gap-2 mb-2 collapse-title">
//                   <h2 className="text-xl font-bold mb-2">
//                     {numOfBrackets - bracket.id}
//                   </h2>
//                   <div className="flex-1">
//                     {bracket.rounds.length &&
//                       bracket.rounds
//                         .sort((a, b) => b.roundId - a.roundId)
//                         .map((round) => (
//                           <div className="flex " key={round.id}>
//                             {round.trials.map((trial) => (
//                               <div
//                                 className="w-[10px] h-[10px] rounded-lg flex items-center justify-center text-center border border-gray-500 "
//                                 style={{
//                                   backgroundColor: trial.metric
//                                     ? getMetricColor(trial.metric)
//                                     : "transparent",
//                                 }}
//                               ></div>
//                             ))}
//                           </div>
//                         ))}
//                   </div>
//                 </div>

//                 <div className="w-full flex items-start justify-start gap-20 collapse-content">
//                   <SimpleBumpChart bracket={bracket} />
//                 </div>
//               </div>
//             );
//           })}
//     </div>
//   );
// };
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

  return (
    <div className="flex items-center bg-base-100 flex-col h-full">
      {data.length > 0 &&
        data.map((bracket, index) => {
          const numOfTrials = bracket.rounds.reduce(
            (acc, round) => acc + round.trials.length,
            0
          );
          const numOfRounds = bracket.rounds.length;

          return (
            <div key={index} className="w-full p-1 ">
              <div className="collapse collapse-arrow bg-white border border-gray-200 rounded-lg">
                <input type="checkbox" className="peer" />
                <div className="collapse-title bg-white">
                  <div className="w-full flex items-center justify-center gap-2">
                    <h2 className="text-lg ">
                      Bracket {numOfBrackets - bracket.id}
                    </h2>
                    <div className="flex-1">
                      {bracket.rounds.length &&
                        bracket.rounds
                          .sort((a, b) => b.roundId - a.roundId)
                          .map((round) => {
                            return (
                              <div className="flex" key={round.id}>
                                {round.trials.map((trial, idx) => (
                                  <div
                                    key={idx}
                                    className="w-[8px] h-[8px] rounded-lg flex items-center justify-center text-center border border-white"
                                    style={{
                                      backgroundColor: trial.metric
                                        ? getMetricColor(trial.metric)
                                        : "transparent",
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          })}
                    </div>
                  </div>
                </div>

                <div className="collapse-content bg-white">
                  <div className="pt-4">
                    <SimpleBumpChart
                      bracket={bracket.bracket}
                      // bracket={bracket}
                      height={numOfTrials * 10 + 60}
                      width={numOfRounds * 60 + 100}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      {/* {brackets.length > 0 &&
        brackets.map((bracket, index) => {
          const numOfTrials = bracket.rounds.reduce(
            (acc, round) => acc + round.trials.length,
            0
          );
          const numOfRounds = bracket.rounds.length;

          return (
            <div key={index} className="w-full p-1 ">
              <div className="collapse collapse-arrow bg-white border border-gray-200 rounded-lg">
                <input type="checkbox" className="peer" />
                <div className="collapse-title bg-white">
                  <div className="w-full flex items-center justify-center gap-2">
                    <h2 className="text-lg ">
                      Bracket {numOfBrackets - bracket.id}
                    </h2>
                    <div className="flex-1">
                      {bracket.rounds.length &&
                        bracket.rounds
                          .sort((a, b) => b.roundId - a.roundId)
                          .map((round) => {
                            return (
                              <div className="flex" key={round.id}>
                                {round.trials.map((trial, idx) => (
                                  <div
                                    key={idx}
                                    className="w-[8px] h-[8px] rounded-lg flex items-center justify-center text-center border border-white"
                                    style={{
                                      backgroundColor: trial.metric
                                        ? getMetricColor(trial.metric)
                                        : "transparent",
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          })}
                    </div>
                  </div>
                </div>

                <div className="collapse-content bg-white">
                  <div className="pt-4">
                    <SimpleBumpChart
                      bracket={bracket}
                      height={numOfTrials * 10 + 60}
                      width={numOfRounds * 60 + 100}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })} */}
    </div>
  );
};
export default Brackets;
