// 시청 데이터 정제 함수
export function cleanViewingData(
  data: any[],
  options: { maxGapSeconds?: number; minSessionSeconds?: number } = {}
) {
  const {
    maxGapSeconds = 30, // 짧은 간격으로 간주할 최대 시간 (초)
    minSessionSeconds = 5, // 최소 세션 시간 (초) - 이보다 짧은 세션은 제거
  } = options;

  // 1단계: visible 세션들을 추출
  const rawSessions = [];
  let currentStart = null;

  for (let i = 0; i < data.length; i++) {
    const event = data[i];

    if (event.isViewing === true) {
      if (currentStart === null) {
        currentStart = event.time;
      }
    } else if (event.isViewing === false && currentStart !== null) {
      // 세션 종료
      const duration = (event.time - currentStart) / 1000;
      if (duration >= minSessionSeconds) {
        rawSessions.push({
          start: currentStart,
          end: event.time,
          duration: duration,
        });
      }
      currentStart = null;
    }
  }

  // 마지막 세션 처리 - 현재 방문 중인 경우는 제외 (타임라인에 표시하지 않음)
  if (currentStart !== null && data.length > 0) {
    const lastEvent = data[data.length - 1];
    // 마지막 이벤트가 false(방문 종료)인 경우만 세션에 추가
    if (!lastEvent.isViewing) {
      const duration = (lastEvent.time - currentStart) / 1000;
      if (duration >= minSessionSeconds) {
        rawSessions.push({
          start: currentStart,
          end: lastEvent.time,
          duration: duration,
        });
      }
    }
    // 현재 방문 중인 경우(마지막 이벤트가 true)는 타임라인에 표시하지 않음
  }

  // 2단계: 짧은 간격으로 분리된 세션들을 병합
  const mergedSessions = [];
  const mergeLog = [];

  for (let i = 0; i < rawSessions.length; i++) {
    const currentSession = rawSessions[i];

    if (mergedSessions.length === 0) {
      mergedSessions.push({ ...currentSession });
      continue;
    }

    const lastMergedSession = mergedSessions[mergedSessions.length - 1];
    const gapSeconds = (currentSession.start - lastMergedSession.end) / 1000;

    if (gapSeconds <= maxGapSeconds) {
      // 병합
      const oldDuration = lastMergedSession.duration;
      lastMergedSession.end = currentSession.end;
      lastMergedSession.duration =
        (lastMergedSession.end - lastMergedSession.start) / 1000;

      mergeLog.push({
        gap: gapSeconds,
        beforeDuration: oldDuration,
        afterDuration: lastMergedSession.duration,
      });
    } else {
      // 새 세션 추가
      mergedSessions.push({ ...currentSession });
    }
  }

  // 3단계: 세션에 추가 정보 추가
  const finalSessions = mergedSessions.map((session, index) => ({
    id: index + 1,
    startTime: session.start,
    endTime: session.end,
    duration: session.duration,
    durationMinutes: Math.round((session.duration / 60) * 10) / 10,
    startDate: new Date(session.start).toLocaleString("ko-KR"),
    endDate: new Date(session.end).toLocaleString("ko-KR"),
  }));

  // console.log("👁️ Visibility sessions processed:", {
  //   inputEvents: data.length,
  //   rawSessions: rawSessions.length,
  //   mergedSessions: mergedSessions.length,
  //   finalSessions: finalSessions.length,
  //   currentlyViewing: data.length > 0 ? data[data.length - 1]?.isViewing : false,
  //   sessions: finalSessions
  // });

  return finalSessions;
}
