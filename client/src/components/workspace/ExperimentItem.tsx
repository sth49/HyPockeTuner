import ExpSummaryView from "./ExpSummaryView";
import { useLongPress } from "./hooks/useLongPress";
// import ExpSummaryView from "../../ExpSummaryView";

interface ExperimentItemProps {
  experiment: any; // 실제 experiment 타입으로 교체
  onSelect: (experimentId: string) => void;
  onLongPress?: (experimentId: string) => void;
}

const ExperimentItem = ({
  experiment,
  onSelect,
  onLongPress,
}: ExperimentItemProps) => {
  const longPressProps = useLongPress({
    onLongPress: () => onLongPress?.(experiment.id),
  });

  const handleClick = () => {
    onSelect(experiment.id);
  };

  return (
    <div
      {...longPressProps}
      onClick={handleClick}
      className=" border-b-[1px] border-b-[#e0e0e0]"
    >
      <ExpSummaryView exp={experiment} />
    </div>
  );
};

export default ExperimentItem;
