/* eslint-disable @typescript-eslint/no-explicit-any */
import { HyperparamSet } from "../models/HyperparamSet";
import { HyperparamTypes } from "../types";
import {
  ExperimentState,
  SocketEvent,
  BracketState,
  TrialState,
} from "../types/experiment";
import { Shap } from "../types/shapValue";

export function processExperimentEvent(
  state: ExperimentState,
  event: SocketEvent
): ExperimentState {
  const { key, value, expId } = event;

  if (key === "status") {
    if (value === "running" || value === "resume") {
      return {
        ...state,
        status: expId === state.expId ? value : state.status,
        runningExp: expId,
      };
    } else {
      return {
        ...state,
        status: expId === state.expId ? value : state.status,
        runningExp: null,
      };
    }
  }

  if (expId !== state.expId) {
    return state;
  }

  switch (key) {
    case "startTime":
      return {
        ...state,
        startTime: value * 1000,
      };
    case "endTime":
      console.log("Setting endTime:", value);
      return {
        ...state,
        endTime: value * 1000, // Convert to milliseconds
      };
    case "visibility":
      if (
        state.visibility &&
        state.visibility.length > 0 &&
        state.visibility[state.visibility.length - 1].isViewing ===
          value.isViewing
      ) {
        return state;
      }
      if (!state.visibility) {
        state.visibility = [];
      }
      return {
        ...state,
        visibility: [
          ...(state.visibility || []),
          {
            time: value.timestamp,
            isViewing: value.isViewing,
            data: value,
          },
        ],
      };

    case "brackets":
      return {
        ...state,
        brackets: initializeBrackets(value),
      };

    case "bracketStart":
      return {
        ...state,
        brackets: state.brackets.map((bracket) =>
          bracket.id === value.bracketId
            ? {
                ...bracket,
                startTime: value.startTime !== "" ? value.startTime : -1,
              }
            : bracket
        ),
      };

    case "bracketDone":
      return {
        ...state,
        brackets: state.brackets.map((bracket) =>
          bracket.id === value.bracketId
            ? {
                ...bracket,
                endTime: value.endTime !== "" ? value.endTime : -1,
              }
            : bracket
        ),
      };

    case "roundStart": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const updatedBrackets = state.brackets.map((bracket) => {
        if (bracket.id === bracketId) {
          return {
            ...bracket,
            rounds: bracket.rounds.map((round) => {
              if (round.roundId === roundId) {
                return {
                  ...round,
                  startTime: value.startTime !== "" ? value.startTime : -1,
                };
              }
              return round;
            }),
          };
        }
        return bracket;
      });
      return {
        ...state,
        brackets: updatedBrackets,
      };
    }

    case "roundDone": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const updatedBrackets = state.brackets.map((bracket) => {
        if (bracket.id === bracketId) {
          return {
            ...bracket,
            rounds: bracket.rounds.map((round) => {
              if (round.roundId === roundId) {
                return {
                  ...round,
                  endTime: value.endTime !== "" ? value.endTime : -1,
                };
              }
              return round;
            }),
          };
        }
        return bracket;
      });

      return {
        ...state,
        brackets: updatedBrackets,
      };
    }
    case "trialStart": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const trialId = value.trialId;
      console.log("🔥 trialStart event:", value);
      const updatedBrackets = state.brackets.map((bracket) => {
        if (bracket.id === bracketId) {
          return {
            ...bracket,
            rounds: bracket.rounds.map((round) => {
              if (round.roundId === roundId) {
                return {
                  ...round,
                  trials: round.trials.map((trial) => {
                    if (trial.trialId === trialId) {
                      console.log("Updating trial:", trial);
                      return {
                        ...trial,
                        startTime:
                          value.startTime !== "" ? value.startTime : -1,
                        status: "running",
                        sample: value.sample || "",
                      };
                    }
                    return trial;
                  }),
                };
              }
              return round;
            }),
          };
        }
        return bracket;
      });

      console.log("Updated brackets after trialStart:", updatedBrackets);
      return {
        ...state,
        brackets: updatedBrackets,
        currBracketId: bracketId,
        currRoundId: roundId,
      };
    }
    case "trialPaused": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const trialId = value.trialId;
      const updatedBrackets = state.brackets.map((bracket) => {
        if (bracket.id === bracketId) {
          return {
            ...bracket,
            rounds: bracket.rounds.map((round) => {
              if (round.roundId === roundId) {
                return {
                  ...round,
                  trials: round.trials.map((trial) => {
                    if (trial.trialId === trialId) {
                      return {
                        ...trial,
                        status: "paused",
                        startTime:
                          value.startTime !== "" ? value.startTime : -1,
                        endTime: value.endTime !== "" ? value.endTime : -1,
                      };
                    }
                    return trial;
                  }),
                };
              }
              return round;
            }),
          };
        }
        return bracket;
      });
      return {
        ...state,
        brackets: updatedBrackets,
      };
    }
    case "trialDone": {
      // ... 기존 trial 찾기 코드 ...
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const trialId = value.trialId;

      console.log("🔥 trialDone event:", {
        bracketId,
        roundId,
        trialId,
        valueId: value.id,
      });

      // Explicitly type t as any or the correct Trial type if available
      let t: any;
      const updatedBrackets = state.brackets.map((bracket) => {
        if (bracket.id === bracketId) {
          return {
            ...bracket,
            rounds: bracket.rounds.map((round) => {
              if (round.roundId === roundId) {
                return {
                  ...round,
                  trials: round.trials.map((trial) => {
                    if (trial.trialId === trialId) {
                      t = {
                        ...trial,
                        id: value.id,
                        startTime:
                          value.startTime !== "" ? value.startTime : -1,
                        endTime: value.endTime !== "" ? value.endTime : -1,
                        metric: value.metric,
                        loss: value.loss,
                        clusterId: "",
                        paramSetId: value.paramSetId,
                        params: value.config,
                        status: "done",
                      };
                      return t;
                    }
                    return trial;
                  }),
                };
              }
              return round;
            }),
          };
        }
        return bracket;
      });

      return {
        ...state,
        brackets: updatedBrackets,
      };
    }

    case "bestTrial": {
      const newBestTrial = {
        id: value.id,
        event: "best",
        bracketId: value.bracketId,
        roundId: value.roundId,
        trialId: value.trialId,
        budget: value.budget,
        params: value.config,
        metric: value.metric,
        loss: value.loss,
        startTime: value.startTime !== "" ? value.startTime : -1,
        endTime: value.endTime !== "" ? value.endTime : -1,
        clusterId: "",
        type: "best",
        isBest: true,
        isFirstRound: false,
        isLastRound: false,
        isFirstBracket: false,
        isLastBracket: false,
        isLastExperiment: false,
        status: "done",
        progress: 0,
        history: [],
        paramSetId: value.paramSetId || "",
        sample: "none",
      } as unknown as TrialState;

      return {
        ...state,
        bestTrial: newBestTrial,
      };
    }

    case "progress": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const trialId = value.trialId;

      if (value.isUserTrial) {
        console.log("🔍 Processing progress for user trial:", {
          bracketId,
          roundId,
          trialId,
          valueId: value.id,
          current: value.current,
        });
        console.log("📋 Current userTrials count:", state.userTrials.length);
        console.log(
          "📋 Current userTrials IDs:",
          state.userTrials.map((t) => ({
            id: t.id,
            status: t.status,
            progress: t.progress,
          }))
        );

        // 🔥 중복 방지: 먼저 기존에 같은 ID를 가진 trial이 있는지 확인
        const existingTrialIndex = state.userTrials.findIndex(
          (trial) => trial.id === value.id
        );

        if (existingTrialIndex !== -1) {
          console.log(
            "✅ Found existing userTrial at index:",
            existingTrialIndex
          );

          // 기존 trial 업데이트
          const updatedUserTrials = [...state.userTrials];
          updatedUserTrials[existingTrialIndex] = {
            ...updatedUserTrials[existingTrialIndex],
            status: "running",
            progress: value.current,
            // bracketId, roundId, trialId도 업데이트 (처음에 -1로 설정된 경우)
            bracketId:
              bracketId !== undefined
                ? bracketId
                : updatedUserTrials[existingTrialIndex].bracketId,
            roundId:
              roundId !== undefined
                ? roundId
                : updatedUserTrials[existingTrialIndex].roundId,
            trialId:
              trialId !== undefined
                ? trialId
                : updatedUserTrials[existingTrialIndex].trialId,
          };

          console.log(
            "✨ Updated existing userTrial:",
            updatedUserTrials[existingTrialIndex]
          );

          return {
            ...state,
            userTrials: updatedUserTrials,
          };
        } else {
          console.warn("⚠️ UserTrial not found for progress update:", {
            searchId: value.id,
            availableIds: state.userTrials.map((t) => t.id),
          });
          return state;
        }
      } else {
        const updatedBrackets = state.brackets.map((bracket) => {
          if (bracket.id === bracketId) {
            return {
              ...bracket,
              rounds: bracket.rounds.map((round) => {
                if (round.roundId === roundId) {
                  return {
                    ...round,
                    trials: round.trials.map((trial) => {
                      if (trial.trialId === trialId) {
                        return {
                          ...trial,
                          status: "running",
                          progress: value.current,
                        };
                      }
                      return trial;
                    }),
                  };
                }
                return round;
              }),
            };
          }
          return bracket;
        });

        return {
          ...state,
          brackets: updatedBrackets,
        };
      }
    }

    case "push": {
      const updatedPush = [
        ...state.push,
        {
          condId: value.condId,
          content: value.content,
          id: value.id,
          status: value.status,
          time: value.time * 1000, // Convert to milliseconds
          title: value.title,
          type: value.type,
        },
      ];
      return {
        ...state,
        push: updatedPush,
      };
    }

    case "interaction": {
      const updatedInteraction = [
        ...state.interactions,
        {
          time: value.time,
          type: value.type
            .split("_")
            .map((s: string, i: number) => {
              if (i !== 0) {
                return s.charAt(0).toUpperCase() + s.slice(1);
              }
              return s;
            })
            .join(""),
          data: value.data,
        },
      ];

      if (value.type === "add_user_trial") {
        console.log("🆕 Interaction Update - add_user_trial", value);
        const data = value.data;
        const trialId = data.id;

        // 🔥 중복 방지: 이미 같은 ID의 userTrial이 있는지 확인
        const existingTrialIndex = state.userTrials.findIndex(
          (trial) => trial.id === trialId
        );

        if (existingTrialIndex !== -1) {
          console.warn("⚠️ UserTrial with same ID already exists:", trialId);
          // 기존 trial이 있으면 새로 추가하지 않고 기존 것을 업데이트
          const updatedUserTrials = [...state.userTrials];
          updatedUserTrials[existingTrialIndex] = {
            ...updatedUserTrials[existingTrialIndex],
            budget: data.iter,
            params: data.config,
            startTime: value.time + 1,
            status: "pending",
          };

          return {
            ...state,
            userTrials: updatedUserTrials,
            interactions: updatedInteraction,
          };
        }

        const newUserTrial = {
          id: trialId,
          event: "user",
          bracketId: -1,
          roundId: -1,
          trialId: -1,
          budget: data.iter,
          params: data.config,
          metric: 0,
          loss: 0,
          startTime: value.time + 1,
          endTime: -1,
          clusterId: "",
          type: "user",
          dataset: "",
          model: "",
          name: "",
          isBest: false,
          isFirstRound: false,
          isLastRound: false,
          isFirstBracket: false,
          isLastBracket: false,
          isLastExperiment: false,
          status: "pending",
          progress: 0,
          history: [],
          paramSet: new HyperparamSet(trialId, data.config), // Initialize with a valid HyperparamSet
          sample: "none",
        };

        console.log("✅ Adding new user trial:", newUserTrial);
        console.log(
          "📊 Total userTrials after add:",
          state.userTrials.length + 1
        );

        return {
          ...state,
          userTrials: [...state.userTrials, newUserTrial],
          interactions: updatedInteraction,
        };
      }

      return {
        ...state,
        interactions: updatedInteraction,
      };
    }

    case "userTrialDone": {
      console.log("🏁 userTrialDone Update", value);

      const userTrialIndex = state.userTrials.findIndex(
        (trial) => trial.id === value.id
      );

      if (userTrialIndex !== -1) {
        const updatedUserTrials = [...state.userTrials];
        updatedUserTrials[userTrialIndex] = {
          ...updatedUserTrials[userTrialIndex],
          params: value.config,
          dataset: value.dataset,
          endTime: value.endTime !== "" ? value.endTime : -1,
          loss: value.loss,
          metric: value.metric,
          model: value.model,
          name: value.name,
          status: "done", // ✅ "user"가 아닌 "done"으로 변경
          id: value.id || updatedUserTrials[userTrialIndex].id,
        };

        console.log(
          "✨ Updated userTrial to done:",
          updatedUserTrials[userTrialIndex]
        );

        return {
          ...state,
          userTrials: updatedUserTrials,
        };
      } else {
        console.warn("⚠️ UserTrial not found for userTrialDone:", {
          searchId: value.id,
          availableIds: state.userTrials.map((t) => t.id),
        });
      }

      return state;
    }

    case "gpu": {
      // console.log("GPU data received:", value);
      const gpuData = {
        temperature: value.temp,
        utilization: value.util,
        memoryUsed: value.used,
        memoryTotal: value.total,
        time: value.time * 1000,
      };
      // console.log("Processed GPU data:", gpuData);
      return {
        ...state,
        gpuInfo: [...state.gpuInfo, gpuData],
      };
    }

    case "shap": {
      console.log("SHAP data received:", value);
      const shap = new Shap(
        value.baseValue,
        value.importanceRanking,
        state.hyperparams || [],
        value.valueImpacts
      );
      console.log("Processed SHAP data:", shap);
      return {
        ...state,
        shap: shap,
      };
    }

    case "narrowConfigspace": {
      console.log("Narrowing config space with data:", value);

      const updatedHyperparams = state.hyperparams;
      value.map((param: any) => {
        updatedHyperparams?.forEach((h) => {
          if (h.name === param.name) {
            if (h.type === HyperparamTypes.Uniform) {
              h.narrowValue = [+param.lower, +param.upper];
            } else {
              h.narrowValue = h.narrowValue.filter(
                (value: string | number | boolean) =>
                  !param.value.includes(value)
              );
            }
          }
        });
      });
      console.log("Updated hyperparams after narrowing:", state.hyperparams);

      return {
        ...state,
        hyperparams: updatedHyperparams,
      };
    }
    default:
      return {
        ...state,
      };
  }
}

function initializeBrackets(bracketsData: any[]): BracketState[] {
  const maxBracket = bracketsData.reduce(
    (max: number, bracket: { id: number }) => Math.max(max, bracket.id),
    -1
  );
  console.log("Max bracket ID:", maxBracket);
  const brackets = bracketsData.map((bracket) => ({
    id: bracket.id,
    startTime: bracket.startTime === "" ? -1 : bracket.startTime,
    endTime: bracket.endTime === "" ? -1 : bracket.endTime,
    rounds: bracket.rounds.map(
      (round: {
        id: any;
        bracketId: any;
        roundId: any;
        budget: any;
        defaultNumTrials: any;
        startTime: any;
        endTime: any;
        trials: any[];
      }) => ({
        id: round.id,
        bracketId: round.bracketId,
        roundId: round.roundId,
        budget: round.budget,
        startTime: round.startTime === "" ? -1 : round.startTime,
        endTime: round.endTime === "" ? -1 : round.endTime,
        defaultNumTrials: round.defaultNumTrials,
        trials: round.trials.map(
          (trial: {
            id: string;
            bracketId: number;
            roundId: number;
            trialId: number;
            budget: number;
            params?: any;
            metric?: number;
            loss?: number;
            startTime?: any;
            endTime?: any;
            clusterId?: string;
            type: string;
          }) => ({
            id: trial.id,
            event: "",
            bracketId: bracket.id,
            roundId: trial.roundId,
            trialId: trial.trialId,
            budget: trial.budget,
            params: trial.params,
            metric: trial.metric,
            loss: trial.loss,
            startTime: trial.startTime === "" ? -1 : trial.startTime,
            endTime: trial.endTime === "" ? -1 : trial.endTime,
            clusterId: trial.clusterId,
            type: trial.type,
            isBest: false,
            isFirstRound: false,
            isLastRound: false,
            isFirstBracket: false,
            isLastBracket: false,
            isLastExperiment: false,
            status: "pending",
            progress: 0,
            history: [],
            sample: "",
          })
        ),
      })
    ),
    totalTrials: bracket.rounds.reduce(
      (sum: any, round: { defaultNumTrials: any }) =>
        sum + round.defaultNumTrials,
      0
    ),
    completedTrials: 0,
  }));

  brackets.forEach((bracket, bracketIndex) => {
    bracket.rounds.forEach((round: { trials: any[] }, roundIndex: number) => {
      round.trials.forEach((trial, trialIndex) => {
        trial.isFirstBracket = roundIndex === 0 && trialIndex === 0;
        trial.isLastBracket =
          roundIndex === bracket.rounds.length - 1 &&
          trialIndex === round.trials.length - 1;
        trial.isLastRound = round.trials.length - 1 === trialIndex;
        trial.isFirstRound = trialIndex === 0;

        if (
          bracketIndex === brackets.length - 1 &&
          roundIndex === bracket.rounds.length - 1 &&
          trialIndex === round.trials.length - 1
        ) {
          trial.isLastExperiment = true;
        }
      });
    });
  });
  return brackets;
}
