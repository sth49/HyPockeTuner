// ExpandedRow.tsx
import React from "react";
import { Row } from "@tanstack/react-table";
import { MdAdd, MdOutlineContentCopy } from "react-icons/md";
import { useNavigation } from "../../hooks/useNavigation";
import { TrialRowType } from "../../types/table";
import { formatDate } from "../../utils";
import { useExperimentStore } from "../../stores/experimentStore";
import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";

interface Props {
  row: Row<TrialRowType>;
}
const ExpandedRow: React.FC<Props> = ({ row }) => {
  const isExpanded = row.getIsExpanded();
  const rowData = row.original;

  const hyperparams = useExperimentStore((state) => state.hyperparams) ?? [];
  const hparamList = hyperparams
    .filter((hp) => !hp.getIsConstant())
    .map((hp) => hp.name);
  const { handleNavigate } = useNavigation();
  return (
    <tr key={`${row.id}-expanded`}>
      <td
        colSpan={row.getVisibleCells().length}
        style={{
          border: isExpanded ? "1px solid oklch(92.8% 0.006 264.531)" : "none",
        }}
      >
        <div
          className={`collapse w-full ${
            isExpanded ? "collapse-open" : "collapse-close"
          }  `}
        >
          <div className="collapse-content w-[100vw] ">
            <div className="flex w-full">
              <div className="w-[50%] mt-2 p-2">
                <p className="text-sm font-semibold mb-2 text-center">
                  Evaluation Result
                </p>
                <div className="flex text-xs gap-1 flex-col">
                  {[
                    "id",
                    "event",
                    "loss",
                    "metric",
                    "budget",
                    "start",
                    "end",
                  ].map((key) => (
                    <div key={key} className="flex justify-between">
                      <span>{key}</span>
                      {key === "id"
                        ? String(rowData[key as keyof TrialRowType]).slice(0, 3)
                        : key === "start" || key === "end"
                        ? formatDate(rowData[key as keyof TrialRowType], "time")
                        : // format(
                        //     new Date(rowData[key as keyof TrialRowType] * 1000),
                        //     "yyyy-MM-dd HH:mm:ss"
                        //   )
                        rowData[key as keyof TrialRowType] !== undefined
                        ? String(rowData[key as keyof TrialRowType])
                        : "N/A"}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-[50%] mt-2 p-2">
                {Object.keys(rowData).filter(
                  (key) =>
                    ![
                      "id",
                      "event",
                      "loss",
                      "metric",
                      "budget",
                      "start",
                      "end",
                      "bracket",
                      "round",
                      "index",
                    ].includes(key)
                ).length > 0 && (
                  <>
                    <p className="font-semibold mb-2 text-sm text-center">
                      Hyperparameters
                    </p>
                    <div className="flex text-xs gap-1 flex-col">
                      {hyperparams?.map((h) => {
                        if (hparamList.includes(h.name) === false) return null;
                        const Icon =
                          hpTypeIcons[HyperparamTypes[h.type].toLowerCase()] ||
                          (() => <span>?</span>);

                        return (
                          <div
                            key={h.displayName}
                            className="flex justify-between"
                          >
                            <span className="flex items-center gap-1">
                              {Icon && <Icon size={15} />}
                              {h.displayName}
                            </span>
                            <span>
                              {h.formatting(
                                rowData[h.name as keyof TrialRowType]
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {/* {Object.entries(rowData)
                        .filter(
                          ([key]) =>
                            ![
                              "id",
                              "event",
                              "loss",
                              "metric",
                              "budget",
                              "start",
                              "end",
                              "bracket",
                              "round",
                              "index",
                            ].includes(key)
                        )
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}</span>
                            <span>{value}</span>
                          </div>
                        ))} */}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex w-full justify-between">
              <button
                className="btn btn-primary btn-outline btn-sm w-[49%] mt-2"
                onClick={() => {
                  // Handle copy to clipboard logic here
                  navigator.clipboard.writeText(
                    JSON.stringify(rowData, null, 2)
                  );
                  // console.log("Copied to clipboard");
                }}
              >
                <MdOutlineContentCopy size={18} />
                Copy to Clipboard
              </button>
              <button
                className="btn btn-primary btn-sm mt-2 w-[49%] text-white"
                onClick={() => {
                  handleNavigate(`/trial/new/${rowData.id}`);
                }}
              >
                <MdAdd size={18} />
                Create a User Trial
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default ExpandedRow;
