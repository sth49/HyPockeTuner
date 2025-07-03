import { OrderedHyperparamOption } from "../../models/HyperparameterOption";
import { useLongPress } from "./hooks/useLongPress";

interface OrderedChoicesProps {
  param: OrderedHyperparamOption;
  onChange: () => void;
  onDelete: (choice: any) => void;
}

const OrderedChoices = ({ param, onChange, onDelete }: OrderedChoicesProps) => {
  const handleAddChoice = () => {
    param.addChoice();
    onChange();
  };

  const handleNewChoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    param.newChoice = e.target.value;
    onChange();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full flex items-center justify-center gap-1">
        {param.choices.map((choice, i) => (
          <ChoiceButton
            key={i}
            choice={choice}
            onDelete={() => onDelete(choice)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 w-full justify-center">
        <input
          type="number"
          placeholder="Add new choice"
          className="input input-sm focus:ring-0 focus:outline-none focus:border-primary mt-2 w-50"
          value={param.newChoice}
          onChange={handleNewChoiceChange}
        />
        <button
          className="btn btn-sm btn-primary text-white"
          onClick={handleAddChoice}
        >
          +
        </button>
      </div>
    </div>
  );
};

interface ChoiceButtonProps {
  choice: any;
  onDelete: () => void;
}

const ChoiceButton = ({ choice, onDelete }: ChoiceButtonProps) => {
  const longPressProps = useLongPress(onDelete);

  return (
    <button
      className="btn btn-sm btn-primary text-white rounded-full"
      onClick={(e) => e.stopPropagation()}
      {...longPressProps}
    >
      {choice}
    </button>
  );
};

export default OrderedChoices;
