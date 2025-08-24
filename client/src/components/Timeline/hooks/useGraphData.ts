// 그래프 데이터 생성 훅
import { useMemo } from "react";
import { useExperimentStore } from "../../../stores/experimentStore";
import { mergeEventData } from "../../../utils/mergeUtils";
import { BandProps, NodeProps, LinkProps, NodeType } from "../types";
import { cleanViewingData } from "../../../utils";
// import { format } from "date-fns";

export const useGraphData = () => {
  const brackets = useExperimentStore((state) => state.brackets);
  const userTrials = useExperimentStore((state) => state.userTrials);
  const push = useExperimentStore((state) => state.push);
  const interactions = useExperimentStore((state) => state.interactions);
  const visibility = useExperimentStore((state) => state.visibility);

  const startTime = useExperimentStore((state) => state.startTime);
  const endTime = useExperimentStore((state) => state.endTime);
  // 현재 시간 - interactions이 변경될 때마다 업데이트되어야 함
  const currentTime = Date.now();

  const graphData: BandProps[] = useMemo(() => {
    if (!brackets || brackets.length === 0) {
      return [];
    }

    const data: BandProps[] = [];
    const numOfBrackets = brackets.length;
    const visibilitySessions = cleanViewingData(visibility);
    // console.log("Visibility sessions:", visibilitySessions);
    let order = -1;
    let bestTrialMetric = -1;

    data.push({
      type: "link",
      bracket: numOfBrackets - brackets[0].id,
      startTime: startTime ?? 0,
      endTime: startTime ?? 0,
      order: order++,
      data: {
        type: "start",
        trials: [
          {
            id: `exp`,
            event: "Exp Start",
            startTime: startTime ?? 0,
            endTime: endTime ?? 0,
            bracketId: -1,
            trialId: 0,
            status: "",
            progress: 0,
            sample: "",
          },
        ],
        events: [],
      },
      prev: null,
      next: null,
    });

    // Bracket node 생성
    data.push({
      type: "node",
      bracket: numOfBrackets - brackets[0].id,
      startTime: startTime ?? 0,
      endTime: startTime ?? 0,
      order: order++,
      data: {
        type: "start",
        trials: [
          {
            id: `exp`,
            event: "Exp Start",
            startTime: startTime ?? 0,
            endTime: endTime ?? 0,
            bracketId: -1,
            trialId: 0,
            status: "",
            progress: 0,
            sample: "",
          },
        ],
      },
      prev: null,
      next: null,
    });

    brackets.forEach((bracket) => {
      if (bracket.startTime === -1 && bracket.endTime === -1) {
        return; // Skip this bracket if time range is invalid
      }
      data.push({
        type: "link",
        bracket: numOfBrackets - bracket.id,
        startTime: bracket.startTime,
        endTime: bracket.startTime,
        order: order++,
        data: {
          type: "pseudo",
          trials: [
            {
              id: `bracket-${bracket.id}`,
              event: `Bracket ${numOfBrackets - bracket.id}`,
              startTime: bracket.startTime,
              endTime: bracket.endTime,
              bracketId: numOfBrackets - bracket.id,
              trialId: 0,
              status: "",
              progress: 0,
              sample: "",
            },
          ],
          events: [],
        },
        prev: null,
        next: null,
      });

      // Bracket node 생성
      data.push({
        type: "node",
        bracket: numOfBrackets - bracket.id,
        startTime: bracket.startTime,
        endTime: bracket.startTime,
        order: order++,
        data: {
          type: "pseudo",
          trials: [
            {
              id: `bracket-${bracket.id}`,
              event: `Bracket ${numOfBrackets - bracket.id}`,
              startTime: bracket.startTime,
              endTime: bracket.endTime,
              bracketId: numOfBrackets - bracket.id,
              trialId: 0,
              status: "",
              progress: 0,
              sample: "",
            },
          ],
        },
        prev: null,
        next: null,
      });

      // 일반 trials 수집
      const allTrials: NodeProps[] = [];
      bracket.rounds.forEach((round) => {
        round.trials.forEach((trial) => {
          if (trial.status === "pending") {
            return; // Skip invalid trials
          }
          allTrials.push({
            type:
              trial.status === "done"
                ? "trial"
                : trial.status === "running"
                ? "current"
                : trial.status === "failed"
                ? "failed"
                : trial.status === "paused"
                ? "paused"
                : "trial",
            trials: [
              {
                ...trial,
                event: `Trial ${numOfBrackets - bracket.id}-${
                  round.roundId + 1
                }-${trial.trialId + 1}`,
                trialId: (trial.trialId ?? 0) + 1,
                bracketId: numOfBrackets - bracket.id,
                roundId: round.roundId + 1,
                startTime: trial.startTime,
                endTime: trial.endTime,
              },
            ],
          });
        });
      });

      // 🔥 UserTrials 처리 개선
      if (userTrials && userTrials.length > 0) {
        // 시간 범위 필터링 로직 개선
        const relevantUserTrials = userTrials.filter((userTrial) => {
          if (bracket.startTime === -1 && bracket.endTime === -1) {
            return false;
          }
          const trialStart = userTrial.startTime ?? 0;
          const bracketStart = bracket.startTime ?? 0;
          const bracketEnd = bracket.endTime ?? 0;

          // const effectiveBracketEnd =
          //   bracketEnd !== -1 ? bracketEnd : currentTime;

          const isInRange =
            bracketEnd === -1
              ? trialStart >= bracketStart
              : trialStart >= bracketStart && trialStart <= bracketEnd;

          return isInRange;
        });

        relevantUserTrials.forEach((userTrial) => {
          // 🔥 문제 3: userTrial 상태에 따른 타입 결정
          let trialType: NodeType = "user";
          if (userTrial.status === "running") {
            trialType = "current"; // 실행 중인 user trial을 시각적으로 구분
          } else if (userTrial.status === "done") {
            trialType = "user";
          } else if (userTrial.status === "failed") {
            trialType = "failed";
          } else if (userTrial.status === "paused") {
            trialType = "paused";
          }

          allTrials.push({
            type: trialType,
            trials: [
              {
                ...userTrial,
                event: `User Trial (${userTrial.id.slice(0, 3)})`,
              },
            ],
          });
        });
      }

      // 🔥 안정적인 시간순 정렬 - 고정된 현재 시간 사용
      allTrials.sort((a, b) => {
        const aTime =
          a.trials[0]?.startTime === -1 ? currentTime : a.trials[0]?.startTime;
        const bTime =
          b.trials[0]?.startTime === -1 ? currentTime : b.trials[0]?.startTime;

        // 시간이 같은 경우 추가 정렬 기준 사용 (안정적인 정렬을 위해)
        if (aTime === bTime) {
          // trialId나 다른 고유한 속성으로 2차 정렬
          const aTrialId = a.trials[0]?.trialId ?? 0;
          const bTrialId = b.trials[0]?.trialId ?? 0;
          if (aTrialId !== bTrialId) {
            return aTrialId - bTrialId;
          }

          // 3차 정렬: ID로 정렬 (문자열이므로 localeCompare 사용)
          const aId = String(a.trials[0]?.id ?? "");
          const bId = String(b.trials[0]?.id ?? "");
          return aId.localeCompare(bId);
        }

        return aTime - bTime;
      });

      // bestTrial 계산 및 데이터 추가
      allTrials.forEach((trial) => {
        if (trial.trials[0].metric != null) {
          if (trial.trials[0].metric > bestTrialMetric) {
            bestTrialMetric = trial.trials[0].metric;
            trial.trials[0].isBest = true;
          }
        }

        data.push({
          type: "link",
          bracket: numOfBrackets - bracket.id,
          startTime: trial.trials[0].startTime,
          endTime: trial.trials[0].endTime,
          order: order++,
          data: {
            type: trial.type,
            trials: trial.trials,
            events: [],
          } as LinkProps,
          prev: null,
          next: null,
        });

        data.push({
          type: "node",
          bracket: numOfBrackets - bracket.id,
          startTime: trial.trials[0].startTime,
          endTime: trial.trials[0].endTime,
          order: order++,
          data: {
            type: trial.type,
            trials: trial.trials,
          },
          prev: null,
          next: null,
        });
      });
    });

    data.forEach((node, index) => {
      if (index > 0) {
        node.prev = data[index - 1];
      } else {
        node.prev = null;
      }
      if (index < data.length - 1) {
        node.next = data[index + 1];
      } else {
        node.next = null;
      }
    });

    const pushData = push
      .filter((item) => isValidPush(item))
      .map((item) => ({
        time: item.time,
        type: "push",
        data: item,
      }));

    // pushData
    const interactionData = interactions
      .filter((item) => isValidInteraction(item))
      .map((item) => ({
        time: item.time,
        type: item.type,
        data: item,
      }));

    // visibility 세션 데이터 추가
    visibilitySessions.forEach((session) => {
      // console.log(
      //   "startTime:",
      //   session.startTime,
      //   format(session.startTime, "MM.dd.yyyy HH:mm:ss")
      // );
      const sessionData = {
        time: session.startTime,
        type: "visibility",
        data: session,
      };
      // @ts-ignore
      interactionData.push(sessionData);
    });

    data.forEach((node, index) => {
      if (node.type === "link") {
        let startTime = node.startTime !== -1 ? node.startTime : currentTime;
        if (index >= 2) {
          if (
            data[index - 2].data?.type !== "pseudo" &&
            data[index - 2].endTime !== -1
          ) {
            startTime = data[index - 2].endTime;
          } else if (
            data[index - 2].startTime !== -1 &&
            data[index - 2].data?.type === "pseudo"
          ) {
            startTime = data[index - 2].startTime;
          }
        }

        const endTime = node.endTime !== -1 ? node.endTime : currentTime;

        if (node.data && node.data.type === "pseudo") {
          // console.log("Pseudo node detected:", node);
          // console.log("Start time:", format(startTime, "MM.dd.yyyy HH:mm:ss"));
          // console.log("End time:", format(endTime, "MM.dd.yyyy HH:mm:ss"));
          // node.startTime = startTime;
          node.endTime = endTime;
        }

        // console.log(
        //   "Start time:",
        //   startTime,
        //   format(startTime, "MM.dd.yyyy HH:mm:ss")
        // );
        // console.log(
        //   "End time:",
        //   endTime,
        //   format(endTime, "MM.dd.yyyy HH:mm:ss")
        // );
        // console.log("itneractionData:", interactionData);

        const interaction = interactionData.filter(
          (inter) => inter.time > startTime && inter.time <= endTime
        );
        // console.log("Filtered interactions:", interaction);

        const pushNotiData = pushData.filter(
          (noti) => noti.time > startTime && noti.time <= endTime
        );

        const allEvents = [...interaction, ...pushNotiData].sort(
          (a, b) => a.time - b.time
        );

        // console.log("All events for node:", allEvents);

        (node.data as LinkProps).events = mergeEventData(allEvents);

        // console.log("Node data after merging events:", node.data);
      }
    });

    return data;
  }, [
    brackets,
    visibility,
    startTime,
    endTime,
    push,
    interactions,
    userTrials,
    currentTime,
  ]);

  const pendingData: BandProps[] = useMemo(() => {
    const pendingData: BandProps[] = [];
    brackets.forEach((bracket) => {
      bracket.rounds.forEach((round) => {
        round.trials.forEach((trial) => {
          if (trial.status === "pending") {
            pendingData.push({
              type: "node",
              bracket: brackets.length - bracket.id,
              startTime: trial.startTime,
              endTime: trial.endTime,
              order: -1, // Pending 노드는 특별한 순서가 없으므로 -1로 설정
              data: {
                type: trial.type,
                trials: [trial],
              } as NodeProps,
              prev: null,
              next: null,
            });
            pendingData.push({
              type: "link",
              bracket: brackets.length - bracket.id,
              startTime: trial.startTime,
              endTime: trial.endTime,
              order: -1, // Pending 링크도 특별한 순서가 없으므로 -1로 설정
              data: {
                type: trial.type,
                trials: [trial],
                events: [],
              } as LinkProps,
              prev: null,
              next: null,
            });
          }
        });
      });
    });
    return pendingData;
  }, [brackets]);

  return [graphData, pendingData] as const;
};

const isValidPush = (push: any) => {
  // const validPusyTypes = ["trial"];
  const validPushTypes = [
    "trial",
    "high-temperature",
    "high-usage",
    "metric-reach",
    "round-done",
    "bracket-done",
    "timeout",
    "experiment-pause",
    "metric-improve",
    "metric-improve-by",
    "metric-improved-by",
    "metric-improved",
    "low-utilization",
    "exception-raised",
  ];
  return validPushTypes.includes(push.type);
};

const isValidInteraction = (interaction: any) => {
  const validInteractionTypes = [
    "addUserTrial",
    "addCondition",
    "editCondition",
    "deleteCondition",
    "experimentPause",
    "experimentResume",
    "narrowConfigspace",
    "launchImmediatelyExp",
    "redefineExperiment",
  ];
  // const validInteractionTypes = [
  //   "addUserTrial",
  //   "addCondition",
  //   "experimentPause",
  //   "experimentResume",
  // ];
  if (interaction.type === "addCondition") {
    return interaction.data.eventCond.type !== "trial-done";
  }
  return validInteractionTypes.includes(interaction.type);
};
