// import { BandProps, LinkProps, NodeProps, EventData } from

import {
  BandProps,
  LinkProps,
  NodeProps,
  EventData,
} from "../components/Timeline/types";

// import {

// }

export const mergeEventData = (allEvents: EventData[]): EventData[] => {
  if (!allEvents?.length) return [];

  const eventMap = new Map<string, EventData>();

  // 시간 순으로 정렬
  const sortedEvents = allEvents
    .filter((event) => event && typeof event.time === "number")
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

  for (const event of sortedEvents) {
    const existing = eventMap.get(event.type);
    if (existing) {
      existing.data.push(event.data);
    } else {
      eventMap.set(event.type, {
        time: event.time,
        type: event.type,
        data: [event],
      });
    }
  }

  return Array.from(eventMap.values());
};

// 공통 그룹 생성 로직 추출
const createMergedGroup = (
  groups: BandProps[],
  orderOffset: number = 1
): [BandProps, BandProps] | null => {
  if (groups.length <= 1) return null;

  const nodeGroups = groups.filter(
    (item) => item.type === "node" && item.data?.trials?.[0]
  );
  const linkGroups = groups.filter(
    (item) => item.type === "link" && item.data?.trials?.[0]
  );

  if (!nodeGroups.length) return null;

  const mergedTrials = nodeGroups.map((node) => node.data!.trials[0]);
  const mergedEvents = linkGroups[0]?.data as LinkProps;
  const baseItem = groups[0];

  const bracketId =
    mergedTrials.filter((trial) => trial.bracketId !== -1).length > 0 &&
    mergedTrials
      .filter((trial) => trial.bracketId !== -1)
      .every(
        (trial) =>
          trial.bracketId ===
          mergedTrials.filter((trial) => trial.bracketId !== -1)[0].bracketId
      )
      ? mergedTrials.filter((trial) => trial.bracketId !== -1)[0].bracketId
      : -1; // 모든 트라이얼이 같은 브래킷에 속하는지 확인

  const groupLink: BandProps = {
    type: "link",
    bracket: bracketId,
    startTime: Date.now(),
    endTime: Date.now(),
    order: baseItem.order + orderOffset,
    data: {
      type: "merged",
      trials: mergedTrials,
      events: mergeEventData(mergedEvents?.events || []),
    } as LinkProps,
  };

  const groupNode: BandProps = {
    type: "node",
    bracket: bracketId,
    startTime: Date.now(),
    endTime: Date.now(),
    order: baseItem.order + orderOffset + 1,
    data: {
      type: "merged",
      trials: mergedTrials,
    } as NodeProps,
  };

  return [groupLink, groupNode];
};

// 수정된 mergeNone 함수
const mergeNone = (
  graphData: BandProps[],
  pendingData: BandProps[]
): {
  executed: BandProps[];
  current: BandProps[];
  pending: BandProps[] | null;
} => {
  // const pendingNodes = graphData.filter(
  //   (item) =>
  //     item.data?.trials?.[0]?.metric === null &&
  //     item.data?.trials?.[0]?.status === "pending"
  // );

  const currentNode = graphData.filter((item) => item.data?.type === "current");

  // 실행된 트라이얼들과 pseudo 노드들
  const executedItems = graphData.filter(
    (item) =>
      (item.data?.trials?.[0]?.metric !== null &&
        item.data?.type !== "current") ||
      item.data?.type === "pseudo" ||
      item.data?.trials?.[0]?.status === "paused"
    // (item.data?.type !== "trial" && item.data?.trials?.[0]?.metric === null)
  );

  // 미실행 트라이얼이 있으면 마지막 pseudo 노드들 제거
  const result = [...executedItems];
  // if (pendingData.length > 0) {
  //   // 뒤에서부터 pseudo 타입 찾아서 제거
  //   while (
  //     result.length > 0 &&
  //     result[result.length - 1]?.data?.type === "pseudo"
  //   ) {
  //     result.pop();
  //   }
  // }

  // 미실행 트라이얼들 병합
  let mergedGroup: BandProps[] | null = null;
  if (pendingData.length > 0) {
    const merged = createMergedGroup(pendingData);
    if (merged) {
      merged.forEach((item) => {
        item.bracket = -2; // 브래킷 표시
      });
      mergedGroup = merged;
    }
  }

  // console.log("mergedGroup", mergedGroup);

  return { executed: result, current: currentNode, pending: mergedGroup };
};

// 더 간단한 버전 (Map 사용하지 않고)
const mergeRoundSimple = (
  graphData: BandProps[]
  // isShowBest: boolean
): BandProps[] => {
  // console.log("graphData in mergeRoundBetweenBest", graphData);

  const result: BandProps[] = [];
  let currentGroup: BandProps[] = [];
  let currentBracket = -999;
  let currentRound = -999;

  const processCurrentGroup = () => {
    if (currentGroup.length === 0) return;

    // if (isShowBest) {
    //   processBestModeGroup(currentGroup, result);
    // } else {
    if (currentGroup.length <= 1) {
      result.push(...currentGroup);
    } else {
      const mergedGroup = createMergedGroup(currentGroup);
      if (mergedGroup) {
        result.push(...mergedGroup);
      } else {
        result.push(...currentGroup);
      }
    }
    // }

    currentGroup = [];
  };

  for (const item of graphData) {
    if (item.data?.type === "pseudo") {
      processCurrentGroup();
      result.push(item);
      continue;
    }

    const bracket = item.bracket ?? -1;
    const round = item.data?.trials?.[0]?.roundId ?? -1;

    // 브래킷이나 라운드가 바뀌면 이전 그룹 처리
    if (
      bracket !== -1 &&
      round !== -1 &&
      (bracket !== currentBracket || round !== currentRound)
    ) {
      processCurrentGroup();
      currentBracket = bracket;
      currentRound = round;
    }

    currentGroup.push(item);
  }

  processCurrentGroup();

  return result;
};

// 브래킷별 병합 (라운드 무시)
const mergeBracketOnly = (
  graphData: BandProps[]
  // isShowBest: boolean
): BandProps[] => {
  const result: BandProps[] = [];
  let currentGroup: BandProps[] = [];
  let currentBracket = -999;

  const processCurrentGroup = () => {
    if (currentGroup.length === 0) return;

    // console.log(`Processing bracket group: ${currentBracket}`, currentGroup);

    // if (isShowBest) {
    //   // showBest 모드: Best 사이의 노드들만 병합
    //   processBestModeGroup(currentGroup, result);
    // } else {
    // 일반 모드: 브래킷 내 모든 항목 병합
    if (currentGroup.length <= 1) {
      result.push(...currentGroup);
    } else {
      const mergedGroup = createMergedGroup(currentGroup);
      if (mergedGroup) {
        result.push(...mergedGroup);
      } else {
        result.push(...currentGroup);
      }
    }
    // }

    currentGroup = [];
  };

  for (const item of graphData) {
    if (item.data?.type === "pseudo") {
      processCurrentGroup();
      result.push(item);
      continue;
    }

    const bracket = item.bracket ?? -1;

    // 브래킷이 바뀌면 이전 그룹 처리
    if (bracket !== currentBracket) {
      processCurrentGroup();
      currentBracket = bracket;
    }

    currentGroup.push(item);
  }

  processCurrentGroup();

  // console.log("final result in mergeBracketOnlyBetweenBest", result);
  return result;
};

const processBestModeGroup = (group: BandProps[], result: BandProps[]) => {
  let pendingNormalItems: BandProps[] = [];

  const mergePendingItems = () => {
    if (pendingNormalItems.length > 1) {
      const merged = createMergedGroup(pendingNormalItems);
      if (merged) {
        result.push(...merged);
      } else {
        result.push(...pendingNormalItems);
      }
    } else if (pendingNormalItems.length === 1) {
      result.push(pendingNormalItems[0]);
    }
    pendingNormalItems = [];
  };

  for (const item of group) {
    if (item.data?.trials?.[0]?.isBest) {
      // console.log("Found best item:", item);

      mergePendingItems();

      result.push(item);
    } else {
      // console.log("Adding to pending normal items:", item);
      pendingNormalItems.push(item);
    }
  }

  mergePendingItems();
};

const mergeAllSimple = (
  graphData: BandProps[],
  isShowBest: boolean
): BandProps[] => {
  if (graphData.length === 0) {
    return [];
  }

  if (isShowBest) {
    const result: BandProps[] = [];
    processBestModeGroup(
      graphData.filter((item) => item.data?.type !== "pseudo"),
      result
    );
    // console.log("result for mergeAllBetweenBest", result);
    return result;
  } else {
    const mergedGroup = createMergedGroup(graphData);
    return mergedGroup ? mergedGroup : graphData;
  }
};

export const mergeNodesAndLinks = (
  graphData: BandProps[],
  pendingData: BandProps[] = [],
  mergeType: string = "individual",
  isCollapse: boolean = false
): BandProps[] => {
  if (!graphData?.length) return [];

  graphData.forEach((item, index) => {
    item.order = index - 1;
  });

  // 먼저 실행된 것과 미실행된 것을 분리
  const { executed, current, pending } = mergeNone(graphData, pendingData);

  // console.log("separated executed", executed);
  // console.log("separated pending", pending);

  let mergedData: BandProps[] = [];

  switch (mergeType) {
    case "individual":
      if (isCollapse) {
        mergedData = mergeAllSimple(executed, true);
      } else {
        mergedData = [...executed];
      }
      break;

    case "round":
      mergedData = mergeRoundSimple(
        executed.filter((item) => item.data?.trials?.[0].type !== "user")
      );
      break;

    case "bracket":
      mergedData = mergeBracketOnly(
        executed.filter((item) => item.data?.trials?.[0].type !== "user")
      );
      break;

    case "all":
      mergedData = mergeAllSimple(executed, false);
      break;

    default:
      mergedData = graphData.map((item, index) => ({
        ...item,
        order: index,
      }));
      break;
  }
  if (current.length > 0) {
    mergedData.push(...current);
  }
  if (pending) {
    mergedData.push(...pending);
  }

  // 최종 order 재설정
  mergedData.forEach((item, index) => {
    item.order = index - 1;
  });

  // console.log("final mergedData", mergedData);
  return mergedData.length > 0 ? mergedData : graphData;
};
