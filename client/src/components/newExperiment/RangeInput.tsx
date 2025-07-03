import { OrderedHyperparamOption } from "../../models/HyperparameterOption";

interface RangeInputProps {
  param: OrderedHyperparamOption;
  onChange: () => void;
}

const RangeInput = ({ param, onChange }: RangeInputProps) => {
  const handleRange0Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    param.range0 = e.target.value;
    param.checkRange(0);
    param.checkRange(1);
    onChange();
  };

  const handleRange1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    param.range1 = e.target.value;
    param.checkRange(1);
    param.checkRange(0);
    onChange();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="Minimum"
        className="input input-sm focus:ring-0 focus:outline-none focus:border-primary"
        value={param.range0}
        onChange={handleRange0Change}
      />
      <p className="text-sm">-</p>
      <input
        type="number"
        placeholder="Maximum"
        className="input input-sm focus:ring-0 focus:outline-none focus:border-primary"
        value={param.range1}
        onChange={handleRange1Change}
      />
    </div>
  );
};

export default RangeInput;
