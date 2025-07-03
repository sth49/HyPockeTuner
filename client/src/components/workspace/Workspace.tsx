import { useMetadataStore } from "../../stores/metadataStore";
import { useNavigation } from "../../hooks/useNavigation";
import { useExperimentLoader } from "./hooks/useExperimentLoader";
import ExperimentList from "./ExperimentList";
import BottomButton from "../common/BottomButton";

const Workspace = () => {
  const expList = useMetadataStore((state) => state.expList);
  const { handleNavigate } = useNavigation();
  const { loadExperiment } = useExperimentLoader();

  const handleExperimentLongPress = (experimentId: string) => {
    console.log("Long pressed experiment:", experimentId);
  };

  return (
    <div className="bg-white gap-4 m-2 min-h-screen">
      <ExperimentList
        experiments={expList}
        onSelectExperiment={loadExperiment}
        onLongPressExperiment={handleExperimentLongPress}
      />
      <BottomButton onClick={() => handleNavigate("/experiment/new/1/new")} />
    </div>
  );
};

export default Workspace;
