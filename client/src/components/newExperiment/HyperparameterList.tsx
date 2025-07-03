import HeaderText from "../common/HeaderText";
import HyperparameterItem from "./HyperparameterItem";
import { HyperparamOption } from "../../models/HyperparameterOption";

interface HyperparameterListProps {
  hyperparams: HyperparamOption[];
  onTypeChange: (index: number, param: HyperparamOption, value: string) => void;
  onChange: () => void;
  onDeleteChoice: (param: HyperparamOption, choice: any) => void;
}

const HyperparameterList = ({
  hyperparams,
  onTypeChange,
  onChange,
  onDeleteChoice,
}: HyperparameterListProps) => {
  return (
    <div className="flex flex-col p-4 bg-white gap-4 m-2 mt-[35px]">
      <HeaderText text="Hyperparameters" />
      {hyperparams.map((param, index) => (
        <HyperparameterItem
          key={index}
          param={param}
          index={index}
          onTypeChange={onTypeChange}
          onChange={onChange}
          onDeleteChoice={onDeleteChoice}
        />
      ))}
    </div>
  );
};

export default HyperparameterList;
