import ExperimentalSetting from "./ExperimentalSetting";
import BOHBSettings from "./BOHBSettings";
import NavigationButton from "./NavigationButton";
import { useExperimentOptions } from "./hooks/useExperimentOptions";
import { useNavigation } from "../../hooks/useNavigation";
import { useParams } from "react-router";

const NewExperiment1 = () => {
  //   const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  const { newExpOptions, datasetOptions, modelOptions, handlers } =
    useExperimentOptions(type ?? "");

  const { handleNavigate } = useNavigation();

  //   const handleNextClick = () => {
  //     navigate("/experiment/new/2");
  //   };

  return (
    <>
      <div>
        <ExperimentalSetting
          name={newExpOptions.name}
          dataset={newExpOptions.dataset}
          model={newExpOptions.model}
          metric={newExpOptions.metric}
          datasetOptions={datasetOptions}
          modelOptions={modelOptions}
          onNameChange={handlers.handleNameChange}
          onDatasetChange={handlers.handleDatasetChange}
          onModelChange={handlers.handleModelChange}
        />

        <BOHBSettings
          eta={newExpOptions.bohb.eta}
          minBudget={newExpOptions.bohb.minBudget}
          maxBudget={newExpOptions.bohb.maxBudget}
          onEtaChange={handlers.handleEtaChange}
          onMinBudgetChange={handlers.handleMinBudgetChange}
          onMaxBudgetChange={handlers.handleMaxBudgetChange}
        />
      </div>

      <NavigationButton
        onClick={() => handleNavigate(`/experiment/new/2/${type}`)}
      />
    </>
  );
};

export default NewExperiment1;
