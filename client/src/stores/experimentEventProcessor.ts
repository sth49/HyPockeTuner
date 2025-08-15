/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotiCondPair } from "../models/notification";
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

  // Debug: Log all events to track order
  if (key === "status") {
    console.log("🔍 Status event received:", {
      key,
      value,
      expId,
      currentExpId: state.expId,
      currentRunningExp: state.runningExp,
    });

    if (value === "running") {
      console.log("✅ Setting runningExp to:", expId);
      return {
        ...state,
        status: expId === state.expId ? value : state.status,
        runningExp: expId,
      };
    } else {
      return {
        ...state,
        status: expId === state.expId ? value : state.status,
        runningExp: expId === state.runningExp ? null : state.runningExp, // Only clear runningExp if it matches the current expId
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
      return {
        ...state,
        endTime: value * 1000, // Convert to milliseconds
      };
    case "visibility": {
      console.log("👁️ Visibility event received:", {
        isViewing: value.isViewing,
        page: value.page,
        userId: value.userId,
        timestamp: new Date(value.timestamp * 1000).toLocaleString(),
      });

      // if (
      //   state.visibility &&
      //   state.visibility.length > 0 &&
      //   state.visibility[state.visibility.length - 1].isViewing ===
      //     value.isViewing
      // ) {
      //   return state;
      // }
      if (!state.visibility) {
        state.visibility = [];
      }

      const newVisibilityData = [
        ...(state.visibility || []),
        {
          time: value.timestamp * 1000,
          isViewing: value.isViewing,
          data: value,
        },
      ];

      console.log("👁️ Updated visibility data:", {
        totalEvents: newVisibilityData.length,
        lastEvent: newVisibilityData[newVisibilityData.length - 1],
        isCurrentlyViewing:
          newVisibilityData[newVisibilityData.length - 1]?.isViewing,
      });

      return {
        ...state,
        visibility: newVisibilityData,
      };
    }

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
                startTime: value.startTime !== "" ? value.startTime * 1000 : -1,
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
                endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
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
                  startTime:
                    value.startTime !== "" ? value.startTime * 1000 : -1,
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
                  endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
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
                        id: value.id,
                        startTime:
                          value.startTime !== "" ? value.startTime * 1000 : -1,
                        params: value.config,
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

      return {
        ...state,
        brackets: updatedBrackets,
        currBracketId: bracketId,
        currRoundId: roundId,
      };
    }
    case "trialKilled": {
      // Handle user trial killed event
      const updatedUserTrials = state.userTrials.map((trial) => {
        if (trial.id === value.id) {
          return {
            ...trial,
            status: "paused",
            progress: 0,
            endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
          };
        }
        return trial;
      });

      console.log("✅ User trial killed successfully:", {
        trialId: value.id,
        killedTrial: updatedUserTrials.find((trial) => trial.id === value.id),
      });

      return {
        ...state,
        userTrials: updatedUserTrials,
      };
    }
    case "trialPaused": {
      const bracketId = value.bracketId;
      const roundId = value.roundId;
      const trialId = value.trialId;
      console.log("🔍 trialPaused event received:", {
        bracketId,
        roundId,
        trialId,
        value,
        brackets: state.brackets.map((b) => ({
          id: b.id,
          rounds: b.rounds.map((r) => ({
            roundId: r.roundId,
            trials: r.trials.map((t) => ({
              trialId: t.trialId,
              status: t.status,
            })),
          })),
        })),
      });
      if (bracketId === -1 && roundId === -1 && trialId === -1) {
        // Handle user trial pause
        const updatedUserTrials = state.userTrials.map((trial) => {
          if (trial.id === value.id) {
            return {
              ...trial,
              status: "paused",
              progress: 0,
              startTime: value.startTime !== "" ? value.startTime * 1000 : -1,
              endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
            };
          }
          return trial;
        });

        return {
          ...state,
          userTrials: updatedUserTrials,
        };
      }
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
                        progress: 0,
                        startTime:
                          value.startTime !== "" ? value.startTime * 1000 : -1,
                        endTime:
                          value.endTime !== "" ? value.endTime * 1000 : -1,
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
      console.log("✅ Trial paused successfully:", {
        bracketId,
        roundId,
        trialId,
        affectedTrial: updatedBrackets
          .find((b) => b.id === bracketId)
          ?.rounds.find((r) => r.roundId === roundId)
          ?.trials.find((t) => t.trialId === trialId),
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
                        // startTime:
                        //   value.startTime !== "" ? value.startTime * 1000 : -1,
                        endTime:
                          value.endTime !== "" ? value.endTime * 1000 : -1,
                        metric: value.metric,
                        loss: value.loss,
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
        startTime: value.startTime !== "" ? value.startTime * 1000 : -1,
        endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
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
        // 🔥 중복 방지: 먼저 기존에 같은 ID를 가진 trial이 있는지 확인
        const existingTrialIndex = state.userTrials.findIndex(
          (trial) => trial.id === value.id
        );

        if (existingTrialIndex !== -1) {
          // 기존 trial 업데이트
          const updatedUserTrials = [...state.userTrials];
          updatedUserTrials[existingTrialIndex] = {
            ...updatedUserTrials[existingTrialIndex],
            status:
              updatedUserTrials[existingTrialIndex].status === "paused"
                ? "paused"
                : "running",
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
                          status:
                            trial.status === "paused" ? "paused" : "running",
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

    case "updateNotiCond": {
      const updatedNotiCond = NotiCondPair.fromJSON(value);
      const updatedNotiCondPairs = state.notiCondPairs.map((pair) => {
        if (pair.id === updatedNotiCond.id) {
          return updatedNotiCond;
        }
        return pair;
      });

      return {
        ...state,
        notiCondPairs: updatedNotiCondPairs,
      };
    }

    case "interaction": {
      let data = null;
      if (value.type === "add_condition" || value.type === "edit_condition") {
        data = NotiCondPair.fromJSON(value.data);
        data.active = true;
        if (value.type === "edit_condition") data.active = value.data.active; // Ensure active state is updated
      }

      const updatedInteraction = [
        ...state.interactions,
        {
          time: value.time * 1000,
          type: value.type
            .split("_")
            .map((s: string, i: number) => {
              if (i !== 0) {
                return s.charAt(0).toUpperCase() + s.slice(1);
              }
              return s;
            })
            .join(""),
          data: data || value.data,
        },
      ];

      if (value.type === "add_user_trial") {
        const data = value.data;
        const trialId = data.id;

        // 🔥 중복 방지: 이미 같은 ID의 userTrial이 있는지 확인
        const existingTrialIndex = state.userTrials.findIndex(
          (trial) => trial.id === trialId
        );

        if (existingTrialIndex !== -1) {
          // 기존 trial이 있으면 새로 추가하지 않고 기존 것을 업데이트
          const updatedUserTrials = [...state.userTrials];
          updatedUserTrials[existingTrialIndex] = {
            ...updatedUserTrials[existingTrialIndex],
            budget: data.iter,
            params: data.config,
            startTime: value.time * 1000,
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
          event: `User Trial (${trialId.slice(0, 3)})`,
          bracketId: -1,
          roundId: -1,
          trialId: -1,
          budget: data.iter,
          params: data.config,
          metric: 0,
          loss: 0,
          startTime: value.time * 1000 + 1,
          endTime: -1,
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
          sample: "none",
        };

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
      const userTrialIndex = state.userTrials.findIndex(
        (trial) => trial.id === value.id
      );

      if (userTrialIndex !== -1) {
        const updatedUserTrials = [...state.userTrials];
        updatedUserTrials[userTrialIndex] = {
          ...updatedUserTrials[userTrialIndex],
          params: value.config,
          dataset: value.dataset,
          endTime: value.endTime !== "" ? value.endTime * 1000 : -1,
          loss: value.loss,
          metric: value.metric,
          model: value.model,
          name: value.name,
          status: "done", // ✅ "user"가 아닌 "done"으로 변경
          id: value.id || updatedUserTrials[userTrialIndex].id,
        };

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
      const gpuData = {
        temperature: value.temp,
        utilization: value.util,
        memoryUsed: value.used,
        memoryTotal: value.total,
        time: value.time * 1000,
      };
      return {
        ...state,
        gpuInfo: [...state.gpuInfo, gpuData],
      };
    }

    case "shap": {
      const shap = new Shap(
        value.baseValue,
        value.importanceRanking,
        state.hyperparams || [],
        value.valueImpacts
      );
      return {
        ...state,
        shap: shap,
      };
    }

    case "narrowConfigspace": {
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
            h.narrowHistory.push(param);
          }
        });
      });

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
