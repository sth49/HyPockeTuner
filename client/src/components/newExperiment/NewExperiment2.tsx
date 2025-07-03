import { useState } from "react";
import { useMetadataStore } from "../../stores/metadataStore";
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

const NewExperiment2 = () => {
  const [selectedHparam, setSelectedHparam] = useState<[any, any] | null>(null);
  const newExpOptions = useMetadataStore((state) => state.newExpOptions);
  const setNewExpOptions = useMetadataStore((state) => state.setNewExpOptions);
  const { handleNavigate } = useNavigation();

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
      ApiClient.addLaunchExperiment(data);
    } else if (launchType === "later") {
      ApiClient.addExperiment(data);
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

      <div className="absolute bottom-0 left-0 w-full h-[70px] flex items-center justify-end p-4 z-10 bg-base-100">
        <button
          className="btn btn-primary w-full text-white uppercase"
          onClick={() => handleNewExp("later")}
        >
          Launch Immediately
        </button>
      </div>
    </>
  );
};

export default NewExperiment2;
