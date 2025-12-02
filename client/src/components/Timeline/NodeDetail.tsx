import { BandProps } from "./types";
import { formatDate, formatDistance, formatting } from "../../utils/formatting";
import { useExperimentStore } from "../../stores/experimentStore";
import { summaryIcons } from "../../utils/icon";
import { MdAdd, MdOutlineContentCopy } from "react-icons/md";
import { useNavigation } from "../../hooks/useNavigation";
import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";
import { useMemo } from "react";

interface NodeDetailProps {
  data: BandProps;
}

type FieldKey = "id" | "budget" | "metric" | "loss";

const NodeDetail = ({ data }: NodeDetailProps) => {
  const metric = useExperimentStore((state) => state.metric);
  const hyperparams = useExperimentStore((state) => state.hyperparams) ?? [];
  const hparamList = hyperparams
    .filter((hp) => !hp.getIsConstant())
    .map((hp) => hp.name);
  const { handleNavigate } = useNavigation();

  
  const truncateMiddle = (text: string, maxLength: number = 10) => {
    if (text.length <= maxLength) return text;

    const start = Math.ceil(maxLength / 2) - 1;
    const end = Math.floor(maxLength / 2) - 1;

    return text.slice(0, start) + "..." + text.slice(-end);
  };

  const trial = data.data?.trials?.[0];
  const isValidTrial =
    data.data?.type !== "pseudo" &&
    trial &&
    data.data?.trials &&
    data.data.trials.length > 0;

  // Memoize field configurations to avoid recreation
  const fieldConfigs = useMemo(() => {
    const getFieldValue = (key: FieldKey) => {
      switch (key) {
        case "id":
          return String(trial?.id).slice(0, 3);
        case "budget":
          return trial?.budget !== undefined ? String(trial.budget) : "N/A";
        case "metric":
          return trial?.metric !== undefined
            ? formatting(Number(trial.metric), "float", 3)
            : "N/A";
        case "loss":
          return trial?.loss !== undefined
            ? formatting(trial.loss as number, "float", 2)
            : "N/A";
        default:
          return "N/A";
      }
    };

    const getFieldLabel = (key: FieldKey) => {
      switch (key) {
        case "id":
          return "ID";
        case "budget":
          return (
            <span className="flex items-center">
              <summaryIcons.budget size={13} />
              BG
            </span>
          );
        case "metric":
          return metric.name.slice(0, 3);
        case "loss":
          return "Loss";
        default:
          return String(key).charAt(0).toUpperCase() + String(key).slice(1);
      }
    };

    return { getFieldValue, getFieldLabel };
  }, [trial, metric.name]);

  // Render field information based on status
  const renderFields = (fields: FieldKey[]) => (
    <div className="flex justify-start gap-2">
      {fields.map((key, i) => (
        <div key={key} className="flex items-center gap-2">
          <div className="flex justify-between gap-1">
            <span className="flex items-center gap-1 text-sm">
              {fieldConfigs.getFieldLabel(key)}
            </span>
            {fieldConfigs.getFieldValue(key)}
          </div>
          {i !== fields.length - 1 && (
            <span className="text-gray-400 ml-2">|</span>
          )}
        </div>
      ))}
    </div>
  );

  // Render period information
  const renderPeriod = () => {
    if (!trial?.startTime) return null;

    const startDate = new Date(trial.startTime);
    const endDate = trial.endTime ? new Date(trial.endTime) : null;

    // Check if start and end dates are on different days
    const isDifferentDay =
      endDate && startDate.toDateString() !== endDate.toDateString();

    // If trial is running or dates are on the same day, show in one line
    if (trial.status === "running" || !isDifferentDay) {
      return (
        <div className="flex justify-between mt-2">
          <p className="text-sm">Period</p>
          <p>
            {formatDate(trial.startTime)}
            {" - "}
            {trial.status !== "running" && trial.endTime ? (
              <>
                {formatDate(trial.endTime, "time", trial.startTime)}
                {" ("}
                {formatDistance(trial.startTime, trial.endTime)}
                {")"}
              </>
            ) : (
              "Running"
            )}
          </p>
        </div>
      );
    }

    // If dates are on different days, show in separate lines
    return (
      <>
        <div className="flex justify-between mt-2">
          <p className="text-sm">Period</p>
          <p>{formatDate(trial.startTime)}</p>
        </div>
        {trial.endTime && (
          <div className="flex justify-between">
            <p className="text-sm"></p>
            <p>
              - {formatDate(trial.endTime)}
              {" ("}
              {formatDistance(trial.startTime, trial.endTime)}
              {")"}
            </p>
          </div>
        )}
      </>
    );
  };

  // Render hyperparameters
  const renderHyperparameters = () => (
    <>
      <p className="text-sm mt-2">Hyperparameters</p>
      <div className="grid grid-cols-2 gap-x-4">
        {hyperparams?.map((param, i) => {
          // const Icon = hpTypeIcons[HyperparamTypes[param.type].toLowerCase()];
          if (hparamList.includes(param.name) === false) return null;
          const Icon =
            param && hparamList.includes(param.name)
              ? hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null
              : hpTypeIcons.constant;

          return (
            <div
              key={param.displayName}
              className="flex justify-between items-center py-1.5"
              // style={{
              //   padding: "5px 15px",
              //   paddingRight: i % 2 === 1 ? "15px" : "0px",
              //   paddingLeft: i % 2 === 0 ? "15px" : "0px",
              // }}
            >
              <span
                className={`tooltip ${
                  i % 2 === 0 ? "tooltip-right" : "tooltip-left"
                } cursor-pointer text-sm flex items-center gap-1`}
                data-tip={param.name}
              >
                {Icon && <Icon size={15} />}
                {param.displayName}
              </span>
              <span
                className={
                  param.formatting(trial?.params[param.name]).length > 10
                    ? `tooltip ${
                        i % 2 === 0 ? "tooltip-right" : "tooltip-left"
                      } cursor-pointer`
                    : ""
                }
                data-tip={
                  param.formatting(trial?.params[param.name]).length > 10
                    ? param.formatting(trial?.params[param.name])
                    : ""
                }
              >
                {truncateMiddle(param.formatting(trial?.params[param.name]))}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );

  // Render action buttons for completed trials
  const renderActionButtons = () => (
    <div className="flex w-full justify-between">
      <button
        className="btn btn-primary btn-outline btn-sm w-[49%] mt-2"
        onClick={() => {
          navigator.clipboard.writeText(JSON.stringify(trial, null, 2));
        }}
      >
        <MdOutlineContentCopy size={18} />
        Copy to Clipboard
      </button>
      <button
        className="btn btn-primary btn-sm mt-2 w-[49%] text-white"
        onClick={() => {
          handleNavigate(`/trial/new/${trial?.id}`);
        }}
      >
        <MdAdd size={18} />
        Create a User Trial
      </button>
    </div>
  );

  // Render content based on trial status
  const renderContent = () => {
    if (!isValidTrial) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Trial information not available</p>
          <div className="text-xs text-gray-400 mt-2">
            <p>Data type: {data.data?.type}</p>
            <p>Trial status: {trial?.status}</p>
            <p>Trials count: {data.data?.trials?.length}</p>
          </div>
        </div>
      );
    }

    const status = trial?.status;
    const fields: FieldKey[] =
      status === "done" ? ["id", "budget", "metric", "loss"] : ["id", "budget"];

    return (
      <>
        <div className="w-full">{renderFields(fields)}</div>
        {renderPeriod()}
        {renderHyperparameters()}
        {status === "done" && renderActionButtons()}
      </>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="h-[50px] border-b border-gray-300 pb-3 flex items-center gap-2 bg-white">
        <p className="text-lg font-bold text-gray-600">
          {data !== null ? `${trial?.event}` : "N/A"}
        </p>
        {trial && trial.status === "running" && (
          <span className="loading loading-spinner text-success loading-xs"></span>
        )}
      </div>
      <div
        className="w-full h-full overflow-y-auto pt-[10px] pb-[30px] overflow-x-hidden"
        style={{ height: `calc(100% - 50px)` }}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default NodeDetail;
