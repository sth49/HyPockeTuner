import {
  HyperparamOption,
  OrderedHyperparamOption,
  UnorderedHyperparamOption,
} from "../../models/HyperparameterOption";
import UnorderedChoices from "./UnorderedChoices";
import OrderedChoices from "./OrderedChoices";
import RangeInput from "./RangeInput";
import { hpTypeIcons } from "../../utils/icon";

interface HyperparameterItemProps {
  param: HyperparamOption;
  index: number;
  onTypeChange: (index: number, param: HyperparamOption, value: string) => void;
  onChange: () => void;
  onDeleteChoice: (param: HyperparamOption, choice: any) => void;
}

const HyperparameterItem = ({
  param,
  index,
  onTypeChange,
  onChange,
  onDeleteChoice,
}: HyperparameterItemProps) => {
  const Icon = hpTypeIcons[param.selectedType];

  const handleTypeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    value: string
  ) => {
    if (e.target.checked) {
      onTypeChange(index, param, value);
    }
  };

  const renderContent = () => {
    if (param instanceof UnorderedHyperparamOption) {
      return <UnorderedChoices param={param} onChange={onChange} />;
    }

    if (param instanceof OrderedHyperparamOption) {
      if (
        param.selectedType === "ordinal" ||
        param.selectedType === "constant"
      ) {
        return (
          <OrderedChoices
            param={param}
            onChange={onChange}
            onDelete={(choice) => onDeleteChoice(param, choice)}
          />
        );
      }
      return <RangeInput param={param} onChange={onChange} />;
    }

    return <>asdf</>;
  };

  return (
    <div className="flex flex-col justify-between items-center pb-2 border-b-[1px] border-b-[#e0e0e0] gap-2">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-1">
          {Icon && <Icon size={15} />}
          <p>{param.name.replace("_", " ")}</p>
        </div>
        {param instanceof OrderedHyperparamOption && (
          <div className="tabs tabs-lift tabs-xs">
            <input
              type="radio"
              name={`tabs-${index}`}
              className="tab"
              aria-label="Value"
              checked={param.tp === "value"}
              onChange={(e) => handleTypeChange(e, "value")}
            />
            <input
              type="radio"
              name={`tabs-${index}`}
              className="tab"
              aria-label="Range"
              checked={param.tp === "range"}
              onChange={(e) => handleTypeChange(e, "range")}
            />
          </div>
        )}
      </div>
      <div className="flex justify-between items-center w-full pb-2">
        {renderContent()}
      </div>
    </div>
  );
};

export default HyperparameterItem;
