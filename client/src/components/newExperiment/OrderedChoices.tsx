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
    // 값이 추가되면 ordinal 타입으로 변경
    if (param.choices.length > 1) {
      param.selectedType = "ordinal";
    }
    onChange();
  };

  const handleNewChoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    param.newChoice = e.target.value;
    // Check if the new choice is valid and update errorChoice
    const numChoice = +param.newChoice;
    param.errorChoice = param.newChoice !== "" && (isNaN(numChoice) || numChoice < 0 || param.choices.includes(numChoice));
    
    // choices가 1개일 때는 constant 값도 업데이트
    if (param.choices.length === 1 && param.newChoice !== "" && !param.errorChoice) {
      param.newConstant = param.newChoice;
    }
    
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
          className={`input input-sm focus:ring-0 focus:outline-none mt-2 w-50 ${
            param.errorChoice 
              ? "border-error focus:border-error" 
              : "border-gray-300 focus:border-primary"
          }`}
          value={param.newChoice}
          onChange={handleNewChoiceChange}
        />
        <button
          className="btn btn-sm btn-primary text-white"
          onClick={handleAddChoice}
          disabled={param.errorChoice || param.newChoice === ""}
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
