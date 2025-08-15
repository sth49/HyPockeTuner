import {
  BandProps,
  LinkProps,
  NodeProps,
  EventData,
} from "../components/Timeline/types";
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
        data:
          // event.data가 array이면 그대로 사용, 아니면 배열로 감싸기
          Array.isArray(event.data) ? event.data : [event.data],
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
    startTime: mergedTrials[0].startTime, // 첫 번째 트라이얼의 시작 시간
    endTime: mergedTrials[mergedTrials.length - 1].endTime, // 마지막 트라이얼의 종료 시간
    order: baseItem.order + orderOffset,
    data: {
      type: "merged",
      trials: mergedTrials,
      // events: mergeEventData(mergedEvents?.events || []),
      events: mergedEvents?.events || [],
    } as LinkProps,
    prev: null,
    next: null,
  };

  const groupNode: BandProps = {
    type: "node",
    bracket: bracketId,
    startTime: mergedTrials[0].startTime, // 첫 번째 트라이얼의 시작 시간
    endTime: mergedTrials[mergedTrials.length - 1].endTime, // 마지막 트라이얼의 종료 시간
    order: baseItem.order + orderOffset + 1,
    data: {
      type: "merged",
      trials: mergedTrials,
    } as NodeProps,
    prev: null,
    next: null,
  };

  return [groupLink, groupNode];
};

// 수정된 mergeNone 함수
const mergeNone = (
  graphData: BandProps[],
  pendingData: BandProps[]
): {
  startNodeLink: BandProps[] | null;
  executed: BandProps[];
  current: BandProps[];
  pending: BandProps[] | null;
} => {
  const startNodeLink =
    graphData.filter((item) => item.data?.type === "start") || null;

  const currentNode = graphData.filter((item) => item.data?.type === "current");

  // 실행된 트라이얼들과 pseudo 노드들 => 수정
  const executedItems = graphData.filter((item) => {
    if (item.data?.type === "pseudo" && isNaN(item.startTime)) {
      return false;
    }
    return (
      (item.data?.trials?.[0]?.metric !== null &&
        item.data?.type !== "current") ||
      item.data?.trials?.[0]?.status === "paused"
    );
  });

  // const executedItems = graphData.filter(
  //   (item) =>
  //     (item.data?.trials?.[0]?.metric !== null &&
  //       item.data?.type !== "current") ||
  //     item.data?.type === "pseudo" ||
  //     item.data?.trials?.[0]?.status === "paused"
  //   // (item.data?.type !== "trial" && item.data?.trials?.[0]?.metric === null)
  // );

  // 미실행 트라이얼이 있으면 마지막 pseudo 노드들 제거
  const result = [...executedItems];

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

  return {
    startNodeLink,
    executed: result,
    current: currentNode,
    pending: mergedGroup,
  };
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
  startNodeLink: BandProps[]
): BandProps[] => {
  if (graphData.length === 0) {
    return [];
  }

  const result: BandProps[] = [];
  // const startNodeLink =
  //   graphData.filter((item) => item.data?.type === "start") || null;
  // if (startNodeLink) {
  //   startNodeLink.forEach((item) => {
  //     result.push(item);
  //   });
  // }
  if (startNodeLink && startNodeLink.length > 0) {
    result.push(...startNodeLink);
  }
  processBestModeGroup(
    graphData.filter(
      (item) => item.data?.type !== "pseudo" && item.data?.type !== "start"
    ),
    result
  );
  return result;
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
  const {
    startNodeLink, // 시작 노드 링크
    executed,
    current,
    pending,
  } = mergeNone(graphData, pendingData);

  // console.log("separated executed", executed);
  // console.log("separated pending", pending);

  let mergedData: BandProps[] = [];

  switch (mergeType) {
    case "individual":
      if (isCollapse) {
        mergedData = mergeAllSimple(executed, startNodeLink ?? []);
      } else {
        mergedData = [
          ...executed.filter((item) => item.data?.type !== "start"),
        ];
      }
      break;

    default:
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
  // return mergedData.length > 0 ? mergedData : graphData;
  if (mergedData.length === 0) {
    return graphData;
  } else {
    mergedData.forEach((item, index) => {
      if (index > 0) {
        item.prev = mergedData[index - 1];
      } else {
        item.prev = null;
      }
      if (index < mergedData.length - 1) {
        item.next = mergedData[index + 1];
      } else {
        item.next = null;
      }
    });
    return mergedData;
  }
};
