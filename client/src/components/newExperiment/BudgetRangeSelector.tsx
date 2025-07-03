import { CustomSelect } from "../../components/CustomSelect";

interface BudgetRangeSelectorProps {
  eta: number;
  minBudget: number;
  maxBudget: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

const BudgetRangeSelector = ({
  eta,
  minBudget,
  maxBudget,
  onMinChange,
  onMaxChange,
}: BudgetRangeSelectorProps) => {
  const budgetOptions = Array.from({ length: 5 }, (_, i) => ({
    value: eta ** i,
    label: eta ** i,
  }));

  return (
    <div className="flex gap-4 items-center">
      <CustomSelect
        className="w-20"
        options={budgetOptions}
        value={{
          value: minBudget,
          label: minBudget,
        }}
        onChange={(e: { value: number; label: number } | null) => {
          if (e) onMinChange(e.value);
        }}
      />
      <p>-</p>
      <CustomSelect
        className="w-20"
        options={budgetOptions}
        value={{
          value: maxBudget,
          label: maxBudget,
        }}
        onChange={(e: { value: number; label: number } | null) => {
          if (e) onMaxChange(e.value);
        }}
      />
    </div>
  );
};

export default BudgetRangeSelector;
