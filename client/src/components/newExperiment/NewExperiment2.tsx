import { useState, useMemo, useEffect } from "react";
import { useMetadataStore } from "../../stores/metadataStore";
import { useExperimentStore } from "../../stores/experimentStore";
import {
  HyperparamOption,
  OrderedHyperparamOption,
  UnorderedHyperparamOption,
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

  
  const currentPath = window.location.pathname;
  const hasRunningExperiment = runningExp !== null && runningExp !== "";

  
  const isValidHyperparams = useMemo(() => {
    return newExpOptions.hyperparams.every((param) => {
      
      if (param instanceof OrderedHyperparamOption && param.tp === "range") {
        return (
          param.range0 !== undefined && 
          param.range1 !== undefined && 
          !isNaN(Number(param.range0)) && 
          !isNaN(Number(param.range1)) && 
          Number(param.range0) < Number(param.range1)
        );
      }
      
      
      if (param instanceof OrderedHyperparamOption && param.tp === "value") {
        if (param.selectedType === "constant") {
          return param.constant !== undefined && param.constant !== "" && !isNaN(Number(param.constant));
        } else {
          return param.choices && param.choices.length > 0;
        }
      }
      
      
      if (param instanceof UnorderedHyperparamOption) {
        return param.choices && param.choices.length > 0;
      }
      
      return true;
    });
  }, [newExpOptions.hyperparams]);

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

  
  useEffect(() => {
    let hasChanges = false;
    
    newExpOptions.hyperparams.forEach((param) => {
      if (param instanceof OrderedHyperparamOption) {
        const shouldBeConstant = param.choices.length === 1 && (param.tp === "value" || param.tp === "choices");
        const shouldBeOrdinal = param.choices.length > 1 && (param.tp === "value" || param.tp === "choices");
        
        console.log(`OrderedParam ${param.name}:`, {
          choices: param.choices,
          tp: param.tp,
          currentSelectedType: param.selectedType,
          shouldBeConstant,
          shouldBeOrdinal
        });
        
        if (shouldBeConstant && param.selectedType !== "constant") {
          console.log(`  → Changing ${param.name} to constant`);
          param.selectedType = "constant";
          hasChanges = true;
        } else if (shouldBeOrdinal && param.selectedType !== "ordinal") {
          console.log(`  → Changing ${param.name} to ordinal`);
          param.selectedType = "ordinal";
          hasChanges = true;
        }
      }
      
      if (param instanceof UnorderedHyperparamOption) {
        const shouldBeConstant = param.activeChoices.length === 1;
        const shouldBeUnordered = param.activeChoices.length > 1;
        
        console.log(`UnorderedParam ${param.name}:`, {
          activeChoices: param.activeChoices,
          currentSelectedType: param.selectedType,
          shouldBeConstant,
          shouldBeUnordered
        });
        
        if (shouldBeConstant && param.selectedType !== "constant") {
          console.log(`  → Changing ${param.name} to constant`);
          param.selectedType = "constant";
          hasChanges = true;
        } else if (shouldBeUnordered && param.selectedType !== "unordered") {
          console.log(`  → Changing ${param.name} to unordered`);
          param.selectedType = "unordered";
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setNewExpOptions({
        ...newExpOptions,
        hyperparams: [...newExpOptions.hyperparams],
      });
    }
  }, [newExpOptions.hyperparams.length, newExpOptions.hyperparams.map(p => `${p.name}-${p instanceof OrderedHyperparamOption ? p.choices.length : p instanceof UnorderedHyperparamOption ? p.activeChoices.length : 0}-${p.selectedType}`).join(',')]);

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
      
      const modal = document.getElementById("launch_immediately_modal") as HTMLDialogElement;
      modal?.showModal();
    } else {
      
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
          
          <>
            <button
              className="btn btn-outline btn-primary flex-1 uppercase"
              onClick={() => handleNewExp("later")}
              disabled={!isValidHyperparams}
            >
              Add
            </button>
            <button
              className="btn btn-primary flex-1 text-white uppercase"
              onClick={handleLaunchImmediately}
              disabled={!isValidHyperparams}
            >
              Launch Immediately
            </button>
          </>
        ) : (
          
          <button
            className="btn btn-primary w-full text-white uppercase"
            onClick={() => handleNewExp("immediate")}
            disabled={!isValidHyperparams}
          >
            Launch Experiment
          </button>
        )}
      </div>
    </>
  );
};

export default NewExperiment2;
