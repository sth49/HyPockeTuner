import ExperimentItem from "./ExperimentItem";

interface ExperimentListProps {
  experiments: any[];
  onSelectExperiment: (experimentId: string) => void;
  onLongPressExperiment?: (experimentId: string) => void;
}

const ExperimentList = ({
  experiments,
  onSelectExperiment,
  onLongPressExperiment,
}: ExperimentListProps) => {
  if (!experiments || experiments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg mb-2">No experiments yet</p>
        <p className="text-sm">Create your first experiment to get started</p>
      </div>
    );
  }

  return (
    <>
      {experiments.map((experiment, index) => (
        <ExperimentItem
          key={experiment.id || index}
          experiment={experiment}
          onSelect={onSelectExperiment}
          onLongPress={onLongPressExperiment}
        />
      ))}
    </>
  );
};

export default ExperimentList;
