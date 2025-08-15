import { BandProps } from "./types";
import { formatDate, formatDistance, formatting } from "../../utils/formatting";
import { useExperimentStore } from "../../stores/experimentStore";
import { summaryIcons } from "../../utils/icon";
import { MdAdd, MdOutlineContentCopy } from "react-icons/md";
import { useNavigation } from "../../hooks/useNavigation";

import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";

interface NodeDetailProps {
  data: BandProps;
}
const NodeDetail = ({ data }: NodeDetailProps) => {
  const metric = useExperimentStore((state) => state.metric);
  const hyperparams = useExperimentStore((state) => state.hyperparams);

  const { handleNavigate } = useNavigation();
  return (
    <div className="w-full h-full flex flex-col ">
      <div className="h-[50px] border-b border-gray-300 pb-3 flex items-end gap-2 bg-white">
        <p className="text-lg font-bold text-gray-600 ">
          {data !== null ? `${data.data?.trials[0].event}` : "N/A"}
        </p>
      </div>
      <div
        className="w-full h-full overflow-y-auto pt-[10px] pb-[30px]"
        style={{
          height: `calc(100% - 50px)`,
        }}
      >
        {data.data?.type !== "pseudo" &&
        data.data?.trials &&
        data.data.trials.length > 0 &&
        data.data?.trials[0]?.status === "done" ? (
          <>
            <div className="w-[100%]">
              <div className="flex justify-between ">
                {(["id", "budget", "metric", "loss"] as const).map((key, i) => (
                  <>
                    <div key={key} className="flex justify-between gap-1">
                      <span className="flex items-center gap-1 text-sm">
                        {key === "id" ? (
                          "ID"
                        ) : key === "metric" ? (
                          metric.name
                        ) : key === "budget" ? (
                          <span className="flex items-center">
                            <summaryIcons.budget size={13} />
                            BG
                          </span>
                        ) : (
                          key.charAt(0).toUpperCase() + key.slice(1)
                        )}
                      </span>
                      {key === "id"
                        ? String(data.data?.trials[0]?.id).slice(0, 3)
                        : key === "loss"
                        ? data.data?.trials[0]?.loss !== undefined
                          ? formatting(
                              data.data?.trials[0]?.loss as number,
                              "float",
                              2
                            )
                          : "N/A"
                        : key === "metric"
                        ? data.data?.trials[0]?.metric !== undefined
                          ? formatting(
                              Number(data.data?.trials[0]?.metric),
                              "float",
                              2
                            )
                          : "N/A"
                        : key === "budget"
                        ? data.data?.trials[0]?.budget !== undefined
                          ? String(data.data?.trials[0]?.budget)
                          : "N/A"
                        : key === "event"
                        ? `${data.data?.trials[0]?.event}`
                        : "N/A"}
                    </div>
                    {i !== 3 && <span className="text-gray-400">|</span>}
                  </>
                ))}
              </div>
            </div>
            {data.data?.trials[0]?.startTime && (
              <div className="flex justify-between mt-2 ">
                <p className="text-sm">Period</p>
                <p>
                  {formatDate(data.data?.trials[0]?.startTime)}
                  {" - "}

                  {data.data?.trials[0]?.endTime ? (
                    <>
                      {formatDate(
                        data.data?.trials[0]?.endTime,
                        "time",
                        data.data?.trials[0]?.startTime
                      )}
                      {" ("}
                      {formatDistance(
                        data.data?.trials[0]?.startTime,
                        data.data?.trials[0]?.endTime
                      )}
                      {")"}
                    </>
                  ) : (
                    "Running"
                  )}
                </p>
              </div>
            )}

            <div className="w-[100%]">
              <p className="text-sm mt-2">Hyperparameters</p>
              <div className="flex grid-cols-2 grid ">
                {hyperparams &&
                  hyperparams.map((param, i) => {
                    const Icon =
                      hpTypeIcons[HyperparamTypes[param.type].toLowerCase()];

                    return (
                      <div
                        key={param.displayName}
                        className="flex justify-between items-center"
                        style={{
                          padding: "5px 15px",
                          paddingRight: i % 2 === 1 ? "0px" : "15px",
                          paddingLeft: i % 2 === 0 ? "0px" : "15px",
                        }}
                      >
                        <span
                          className="text-sm flex items-center gap-1 tooltip tooltip-right"
                          data-tip={param.name}
                        >
                          {Icon && <Icon size={15} />}

                          {param.displayName}
                        </span>
                        <span>
                          {param.formatting(
                            data.data?.trials[0].params[param.name]
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="flex w-full justify-between">
              <button
                className="btn btn-primary btn-outline btn-sm w-[49%] mt-2"
                onClick={() => {
                  // Handle copy to clipboard logic here
                  navigator.clipboard.writeText(
                    JSON.stringify(data.data?.trials[0], null, 2)
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
                  handleNavigate(`/trial/new/${data.data?.trials[0].id}`);
                }}
              >
                <MdAdd size={18} />
                Create a User Trial
              </button>
            </div>
          </>
        ) : data.data?.trials[0].status === "paused" ? (
          <>
            <div className="w-[100%]">
              <div className="flex justify-start gap-4 ">
                {(["id", "budget"] as const).map((key, i) => (
                  <>
                    <div key={key} className="flex justify-between gap-1">
                      <span className="flex items-center gap-1 text-sm">
                        {key === "id" ? (
                          "ID"
                        ) : key === "budget" ? (
                          <summaryIcons.budget size={13} />
                        ) : null}
                      </span>
                      {key === "id"
                        ? String(data.data?.trials[0]?.id).slice(0, 3)
                        : key === "budget"
                        ? data.data?.trials[0]?.budget !== undefined
                          ? String(data.data?.trials[0]?.budget)
                          : "N/A"
                        : key === "event"
                        ? `${data.data?.trials[0]?.event}`
                        : "N/A"}
                    </div>
                    {i !== 1 && <span className="text-gray-400">|</span>}
                  </>
                ))}
              </div>
            </div>
            {data.data?.trials[0]?.startTime && (
              <div className="flex justify-between mt-2 ">
                <p className="text-sm">Period</p>
                <p>
                  {formatDate(data.data?.trials[0]?.startTime)}
                  {" - "}

                  {data.data?.trials[0]?.endTime ? (
                    <>
                      {formatDate(
                        data.data?.trials[0]?.endTime,
                        "time",
                        data.data?.trials[0]?.startTime
                      )}
                      {" ("}
                      {formatDistance(
                        data.data?.trials[0]?.startTime,
                        data.data?.trials[0]?.endTime
                      )}
                      {")"}
                    </>
                  ) : (
                    "Running"
                  )}
                </p>
              </div>
            )}
            <div className="w-[100%]">
              <p className="text-sm mt-2">Hyperparameters</p>
              <div className="flex grid-cols-2 grid ">
                {hyperparams &&
                  hyperparams.map((param, i) => {
                    const Icon =
                      hpTypeIcons[HyperparamTypes[param.type].toLowerCase()];

                    return (
                      <div
                        key={param.displayName}
                        className="flex justify-between items-center"
                        style={{
                          padding: "5px 15px",
                          paddingRight: i % 2 === 1 ? "0px" : "15px",
                          paddingLeft: i % 2 === 0 ? "0px" : "15px",
                        }}
                      >
                        <span
                          className="text-sm flex items-center gap-1 tooltip tooltip-right"
                          data-tip={param.name}
                        >
                          {Icon && <Icon size={15} />}
                          {param.displayName}
                        </span>
                        <span>
                          {param.formatting(
                            data.data?.trials[0].params[param.name]
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Trial information not available</p>
            <div className="text-xs text-gray-400 mt-2">
              <p>Data type: {data.data?.type}</p>
              <p>Trial status: {data.data?.trials?.[0]?.status}</p>
              <p>Trials count: {data.data?.trials?.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default NodeDetail;
