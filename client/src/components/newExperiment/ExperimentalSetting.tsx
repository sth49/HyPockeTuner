import HeaderText from "../common/HeaderText";
import { CustomSelect } from "../../components/CustomSelect";
import SettingField from "./SettingField";

interface ExperimentalSettingProps {
  name: string;
  dataset: string;
  model: string;
  metric: string;
  datasetOptions: Array<{ value: string; label: string }>;
  modelOptions: Array<{ value: string; label: string }>;
  onNameChange: (name: string) => void;
  onDatasetChange: (dataset: { value: string; label: string } | null) => void;
  onModelChange: (model: { value: string; label: string } | null) => void;
}

const ExperimentalSetting = ({
  name,
  dataset,
  model,
  metric,
  datasetOptions,
  modelOptions,
  onNameChange,
  onDatasetChange,
  onModelChange,
}: ExperimentalSettingProps) => {
  return (
    <div className="flex flex-col p-4 bg-white gap-4 m-2">
      <HeaderText text="Experimental Setting" />

      <SettingField label="Name">
        <input
          type="text"
          className="w-50 rounded-sm p-2 border border-gray-300"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </SettingField>

      <SettingField label="Dataset">
        <CustomSelect
          className="w-50"
          options={datasetOptions}
          value={dataset ? { value: dataset, label: dataset } : undefined}
          onChange={onDatasetChange}
        />
      </SettingField>

      <SettingField label="Model">
        <CustomSelect
          className="w-50"
          options={modelOptions}
          value={model ? { value: model, label: model } : undefined}
          onChange={onModelChange}
        />
      </SettingField>

      <SettingField label="Metric">
        <p>{metric}</p>
      </SettingField>
    </div>
  );
};

export default ExperimentalSetting;
