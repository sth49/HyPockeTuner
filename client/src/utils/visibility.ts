
export function cleanViewingData(
  data: any[],
  options: { maxGapSeconds?: number; minSessionSeconds?: number } = {}
) {
  const {
    maxGapSeconds = 30,
    minSessionSeconds = 5,
  } = options;

  
  const rawSessions = [];
  let currentStart = null;

  for (let i = 0; i < data.length; i++) {
    const event = data[i];

    if (event.isViewing === true) {
      if (currentStart === null) {
        currentStart = event.time;
      }
    } else if (event.isViewing === false && currentStart !== null) {
      
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

  
  if (currentStart !== null && data.length > 0) {
    const lastEvent = data[data.length - 1];
    
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
    
  }

  
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
      
      mergedSessions.push({ ...currentSession });
    }
  }

  
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
