import { UnorderedHyperparamOption } from "../../models/HyperparameterOption";

interface UnorderedChoicesProps {
  param: UnorderedHyperparamOption;
  onChange: () => void;
}

const UnorderedChoices = ({ param, onChange }: UnorderedChoicesProps) => {
  const handleChoiceToggle = (choice: any) => {
    if (param.activeChoices.includes(choice)) {
      param.deleteChoice(choice);
    } else {
      param.addChoice(choice);
    }
    onChange();
  };

  return (
    <div className="w-full flex justify-around gap-1">
      {param.choices.map((choice, i) => (
        <div className="flex items-center gap-1" key={i}>
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={param.activeChoices.includes(choice)}
            onChange={() => handleChoiceToggle(choice)}
          />
          <p className="text-sm">
            {choice === true ? "True" : choice === false ? "False" : choice}
          </p>
        </div>
      ))}
    </div>
  );
};

export default UnorderedChoices;
