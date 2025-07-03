/* eslint-disable @typescript-eslint/no-explicit-any */
// import { ExpSummary } from "../types";
// import { formatting } from "../utils/utils";
// import { progressColor } from "../utils/color";

import { format } from "date-fns";
import { ExpSummary } from "../../types";
import { formatting } from "../../utils/utils";
import { progressColor } from "../../utils/color";

// import { format } from "date-fns";
import { summaryIcons as icons } from "../../utils/icon";
interface ExpSummaryViewProps {
  exp: ExpSummary;
}

const ExpSummaryView = ({ exp }: ExpSummaryViewProps) => {
  const data = {
    hparamLength: exp.hparamList.length,
    budget: exp.budget,
    bestMetric: exp.bestTrial ? formatting(exp.bestTrial, "float") : null,
    doneTrials: `${exp.doneTrials} / ${exp.allTrials}`,
    lastUpdatedAt: format(Number(exp.lastUpdatedAt) * 1000, "MM/dd"),
  };

  return (
    <div className="w-full h-[70px] p-2 flex gap-1">
      <div className="flex-1 h-full">
        <div className="w-full flex gap-1 uppercase text-primary items-center text-sm">
          <p className="text-lg font-semibold ">
            {exp.name} ({exp.id.slice(0, 3)})
          </p>
          <p>|</p>
          <p> {exp.dataset}</p>
          <p>|</p>
          <p> {exp.model === "simple_kernel" ? "CNN" : exp.model}</p>
          {exp.status === "running" && (
            <span className="loading loading-spinner text-success loading-xs"></span>
          )}
        </div>
        <div className="w-full flex gap-1 items-center text-sm">
          {Object.entries(data).map(([key, value], index) => {
            const IconComponent = icons[key as keyof typeof icons];
            return (
              <div key={index} className="flex items-center gap-1">
                <div className="flex items-center text-xs text-gray-500 justify-center gap-1">
                  {IconComponent && <IconComponent size={15} />}
                  <p>{value?.toString()}</p>
                </div>
                {index < Object.entries(data).length - 1 && <p>|</p>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-[40px] h-full flex items-center justify-center">
        <div
          className={`radial-progress ${progressColor[exp.status]}`}
          style={
            {
              "--value": (exp.doneTrials / exp.allTrials) * 100,
              "--size": "40px",
            } as React.CSSProperties
          }
          aria-valuenow={(exp.doneTrials / exp.allTrials) * 100}
          role="progressbar"
        >
          <p className="text-[0.6rem]">
            {formatting((exp.doneTrials / exp.allTrials) * 100, "int")}%
          </p>
        </div>
      </div>
      {/* <div className="w-[40px] h-full flex items-center justify-center"></div> */}
      {/* <div className="w-[20px] h-full flex items-center justify-center">
        
      </div> */}
    </div>
  );
};

export default ExpSummaryView;
