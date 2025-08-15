import { useState } from "react";
import { useMetadataStore } from "../../stores/metadataStore";
import { useExperimentStore } from "../../stores/experimentStore";
import {
  HyperparamOption,
  OrderedHyperparamOption,
} from "../../models/HyperparameterOption";
import HyperparameterList from "./HyperparameterList";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { useNavigation } from "../../hooks/useNavigation";
import {
  ExceptionHappenCond,
  ExperimentFinishCond,
  ExperimentPauseCond,
  ExperimentResumeCond,
  ExperimentStartCond,
  HighTemperatureCond,
  HighUsageCond,
  LowUtilizationCond,
  NotiCondPair,
} from "../../models/notification";
import { toJSON } from "../../types/option";
import ApiClient from "../../api/api";
import ExperimentActionModal from "../common/ExperimentActionModal";

const NewExperiment2 = () => {
  const [selectedHparam, setSelectedHparam] = useState<[any, any] | null>(null);
  const newExpOptions = useMetadataStore((state) => state.newExpOptions);
  const setNewExpOptions = useMetadataStore((state) => state.setNewExpOptions);
  const runningExp = useExperimentStore((state) => state.runningExp);
  const { handleNavigate } = useNavigation();

  // 현재 경로
  const currentPath = window.location.pathname;
  const hasRunningExperiment = runningExp !== null && runningExp !== "";

  const handleTypeChange = (
    index: number,
    param: HyperparamOption,
    value: string
  ) => {
    param.tp = value;
    if (param.tp === "value") {
      param.selectedType = param.choices.length === 1 ? "constant" : "ordinal";
    } else if (param.tp === "range") {
      param.selectedType = "uniform";
    }

    setNewExpOptions({
      ...newExpOptions,
      hyperparams: [
        ...newExpOptions.hyperparams.slice(0, index),
        param,
        ...newExpOptions.hyperparams.slice(index + 1),
      ],
    });
  };

  const handleChange = () => {
    setNewExpOptions({
      ...newExpOptions,
      hyperparams: [...newExpOptions.hyperparams],
    });
  };

  const handleDeleteChoice = (param: HyperparamOption, choice: any) => {
    setSelectedHparam([param, choice]);
    (document.getElementById("delete_modal") as HTMLDialogElement)?.showModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedHparam) {
      const updatedOptionState = newExpOptions;
      updatedOptionState.hyperparams.forEach((hparam) => {
        if (
          hparam instanceof OrderedHyperparamOption &&
          hparam.name === selectedHparam[0].name
        ) {
          hparam.deleteChoice(selectedHparam[1]);
        }
      });
      setNewExpOptions({
        ...updatedOptionState,
        hyperparams: [...updatedOptionState.hyperparams],
      });
    }
    (document.getElementById("delete_modal") as HTMLDialogElement)?.close();
  };

  const handleLaunchImmediately = () => {
    if (hasRunningExperiment) {
      // 실행 중인 실험이 있으면 확인 모달 표시
      const modal = document.getElementById("launch_immediately_modal") as HTMLDialogElement;
      modal?.showModal();
    } else {
      // 실행 중인 실험이 없으면 바로 실행
      handleNewExp("immediate");
    }
  };

  const handleNewExp = (launchType: "immediate" | "later") => {
    console.log(newExpOptions);
    console.log("Launching experiment:", launchType);

    const defaultNotiCondPairList: NotiCondPair[] = [];
    let defaultNotiCondPair: NotiCondPair;

    defaultNotiCondPair = new NotiCondPair(new ExperimentStartCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);
    defaultNotiCondPair = new NotiCondPair(new ExperimentPauseCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);
    defaultNotiCondPair = new NotiCondPair(new ExperimentResumeCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);
    defaultNotiCondPair = new NotiCondPair(new ExperimentFinishCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);

    defaultNotiCondPair = new NotiCondPair(new LowUtilizationCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);

    defaultNotiCondPair = new NotiCondPair(new HighTemperatureCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);

    defaultNotiCondPair = new NotiCondPair(new HighUsageCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);

    defaultNotiCondPair = new NotiCondPair(new ExceptionHappenCond(), null);
    defaultNotiCondPairList.push(defaultNotiCondPair);

    const data = toJSON(newExpOptions);
    data["cond_list"] = defaultNotiCondPairList.map((condPair) => {
      return condPair.toJSON();
    });

    const lastViewedState = {
      metric: 0,
      currNumTrials: 0,
      totalTrials: 0,
      expId: "",
      capturedAt: 0,
    };
    data["lastViewedState"] = lastViewedState;

    console.log("Experiment data to be sent:", data);

    if (launchType === "immediate") {
      ApiClient.addLaunchExperiment(
        data,
        currentPath.includes("redefine") ? "redefine" : ""
      );
    } else if (launchType === "later") {
      ApiClient.addExperiment(
        data,
        currentPath.includes("redefine") ? "redefine" : ""
      );
    }

    handleNavigate("/workspace");
  };

  return (
    <>
      <div className="text-gray-500">
        <HyperparameterList
          hyperparams={newExpOptions.hyperparams}
          onTypeChange={handleTypeChange}
          onChange={handleChange}
          onDeleteChoice={handleDeleteChoice}
        />
      </div>

      <DeleteConfirmModal
        selectedHparam={selectedHparam}
        onDelete={handleDeleteConfirm}
      />

      {/* Launch Immediately 확인 모달 */}
      <ExperimentActionModal
        modalId="launch_immediately_modal"
        title="Launch Experiment Immediately"
        message={`Experiment "${runningExp?.slice(0, 8)}..." is currently running. Launching this experiment immediately will automatically pause the running one. Do you want to continue?`}
        confirmText="Launch Immediately"
        onConfirm={() => handleNewExp("immediate")}
        actionType="start"
      />

      <div className="absolute bottom-0 left-0 w-full h-[70px] flex items-center justify-end p-4 z-10 bg-base-100 gap-3">
        {hasRunningExperiment ? (
          // 실행 중인 실험이 있을 때: 두 개 버튼
          <>
            <button
              className="btn btn-outline btn-primary flex-1 uppercase"
              onClick={() => handleNewExp("later")}
            >
              Add
            </button>
            <button
              className="btn btn-primary flex-1 text-white uppercase"
              onClick={handleLaunchImmediately}
            >
              Launch Immediately
            </button>
          </>
        ) : (
          // 실행 중인 실험이 없을 때: 하나 버튼
          <button
            className="btn btn-primary w-full text-white uppercase"
            onClick={() => handleNewExp("immediate")}
          >
            Launch Experiment
          </button>
        )}
      </div>
    </>
  );
};

export default NewExperiment2;
