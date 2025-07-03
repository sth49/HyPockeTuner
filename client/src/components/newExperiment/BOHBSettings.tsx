import { IoMdHelpCircleOutline } from "react-icons/io";
import HeaderText from "../common/HeaderText";
import SettingField from "./SettingField";
import EtaRadioGroup from "./EtaRadioGroup";
import BudgetRangeSelector from "./BudgetRangeSelector";

interface BOHBSettingsProps {
  eta: number;
  minBudget: number;
  maxBudget: number;
  onEtaChange: (eta: number) => void;
  onMinBudgetChange: (value: number) => void;
  onMaxBudgetChange: (value: number) => void;
}

const BOHBSettings = ({
  eta,
  minBudget,
  maxBudget,
  onEtaChange,
  onMinBudgetChange,
  onMaxBudgetChange,
}: BOHBSettingsProps) => {
  return (
    <div className="flex flex-col p-4 bg-white gap-4 m-2">
      <HeaderText text="BOHB Hyperparameters" />

      <SettingField
        label={
          <div className="flex items-center justify-between gap-1">
            η
            <div
              className="tooltip tooltip-right"
              data-tip="Set η ≥ 2;
              only top 1/η configurations proceed after each round."
            >
              <IoMdHelpCircleOutline size={20} />
            </div>
          </div>
        }
      >
        <EtaRadioGroup value={eta} onChange={onEtaChange} />
      </SettingField>

      <SettingField label="Budget">
        <BudgetRangeSelector
          eta={eta}
          minBudget={minBudget}
          maxBudget={maxBudget}
          onMinChange={onMinBudgetChange}
          onMaxChange={onMaxBudgetChange}
        />
      </SettingField>
    </div>
  );
};

export default BOHBSettings;
