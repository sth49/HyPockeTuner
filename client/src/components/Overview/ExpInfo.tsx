import { useExperimentStore } from "../../stores/experimentStore";
import { useMetadataStore } from "../../stores/metadataStore";
import { formatDate, formatting } from "../../utils";

import { progressBadgeColor, progressColor } from "../../utils/color";
import { summaryIcons as icons } from "../../utils/icon";
import ProgressButton from "../common/ProgressButton";

const ExpInfo = () => {
  const expId = useExperimentStore((state) => state.expId);
  const startTime = useExperimentStore((state) => state.startTime);
  const endTime = useExperimentStore((state) => state.endTime);

  const expList = useMetadataStore((state) => state.expList);
  const bestTrial = useExperimentStore((state) => state.bestTrial);
  const expData = expList.find((exp) => exp.id === expId) || null;
  if (!expData) {
    return (
      <div className="w-full h-full p-2 bg-red-50">Experiment not found</div>
    );
  }
  const data = {
    hparamLength: expData.hparamList.length,
    budget: expData.budget,
    bestMetric: bestTrial ? formatting(bestTrial.metric ?? 0, "float") : null,
    doneTrials: `${expData.doneTrials} / ${expData.allTrials}`,
  };

  const timeData = {
    lastUpdatedAt: expData.lastUpdatedAt
      ? formatDate(Number(expData.lastUpdatedAt) * 1000)
      : // format(Number(expData.lastUpdatedAt) * 1000, "MM.dd.yyyy HH:mm a")
        "N/A",
    startTime: startTime
      ? formatDate(Number(startTime))
      : // format(Number(startTime), "MM.dd.yyyy HH:mm a")
        "N/A",
    endTime: endTime
      ? formatDate(Number(endTime))
      : // format(Number(endTime), "MM.dd.yyyy HH:mm a")
        "N/A",
  };

  const typeName = {
    hparamLength: "Configs",
    budget: "Budget",
    bestMetric: "Best",
    doneTrials: "Tested",
  };
  const typeTime = {
    lastUpdatedAt: "Last Updated",
    startTime: "Start Time",
    endTime: "End Time",
  };

  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      {/* Overview Header */}
      <div className="w-full flex gap-1 uppercase items-center text-lg mb-2">
        <div
          className={`badge ${
            progressBadgeColor[expData.status]
          } badge-sm text-white`}
        >
          {expData.status}
        </div>
        <p className="text-lg font-semibold ">
          {expData.name} ({expData.id.slice(0, 3)})
        </p>
        <p>|</p>
        <p> {expData.dataset}</p>
        <p>|</p>
        <p> {expData.model === "simple_kernel" ? "CNN" : expData.model}</p>
      </div>
      {/* Overview Data except Time */}
      <div className="w-full flex gap-1 items-between">
        <div className="flex flex-col gap-1.5 items-between w-[65%]">
          {Object.entries(data).map(([key, value], index) => {
            const IconComponent = icons[key as keyof typeof icons];
            return (
              <div key={index} className="flex items-center gap-1 ">
                <div className="flex items-center justify-left gap-1 w-[150px]">
                  {IconComponent && <IconComponent size={15} />}
                  <p>{typeName[key as keyof typeof typeName]}</p>
                </div>
                <p>{value?.toString()}</p>
              </div>
            );
          })}
        </div>
        <div className="w-[35%] h-full flex justify-center text-center items-center">
          <div
            className={`radial-progress ${progressColor[expData.status]}`}
            style={
              {
                "--value": (expData.doneTrials / expData.allTrials) * 100,
                "--size": "100px",
              } as React.CSSProperties
            }
            aria-valuenow={(expData.doneTrials / expData.allTrials) * 100}
            role="progressbar"
          >
            {expData.status === "finished" ? (
              <p>100%</p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p>
                  {formatting(
                    (expData.doneTrials / expData.allTrials) * 100,
                    "int"
                  )}
                  %
                </p>
                <ProgressButton isGhost={true} />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Overview Time Data */}
      <div className="flex flex-col gap-1.5 items-between w-[100%] ">
        {Object.entries(timeData).map(([key, value], index) => {
          if (value === "N/A") {
            return null; // Skip if value is "N/A"
          }
          const IconComponent = icons[key as keyof typeof icons];
          return (
            <div key={index} className="flex items-center gap-1">
              <div className="flex items-center justify-left gap-1 w-[150px]">
                {IconComponent && <IconComponent size={15} />}
                <p>{typeTime[key as keyof typeof typeTime]}</p>
              </div>
              <p>{value?.toString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ExpInfo;
