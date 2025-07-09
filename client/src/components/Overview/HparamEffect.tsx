import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";
import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";
import ImportancePlot from "../common/ImportancePlot";
import { formatting } from "../../utils/formatting";
import { useState } from "react";
import { LuChartBarBig, LuChartScatter } from "react-icons/lu";
const HparamEffect = () => {
  const hyperparams = useExperimentStore((state) => state.hyperparams) ?? [];
  const shap = useExperimentStore((state) => state.shap);

  // 모든 파라미터의 toggle 상태를 하나의 객체로 관리
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  if (hyperparams.length === 0) {
    return (
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="Hyperparameter Effects" />
        <p className="text-gray-500">
          Hyperparameter effects are not available yet. Stay tuned!
        </p>
      </div>
    );
  }

  // toggle 상태 변경 함수
  const handleToggleChange = (paramName: string) => {
    setToggleStates((prev) => ({
      ...prev,
      [paramName]: !prev[paramName],
    }));
  };

  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <div className="flex items-center justify-between">
        <HeaderText text="Hyperparameter Effects" />
        {/* <p>{formatting(shap?.baseValue ?? 0, "float", 2)}</p> */}
      </div>

      {shap?.shapValues
        .slice()
        .sort((a, b) => {
          return (shap.ranking[b.name] || 0) - (shap.ranking[a.name] || 0);
        })
        .map((param, index) => {
          const Icon =
            hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;

          // 현재 파라미터의 toggle 상태 (기본값: false)
          const isToggled = toggleStates[param.name] || false;

          return (
            <div
              className="flex flex-col gap-2 border-b border-gray-300 pt-2 pb-4"
              key={index}
            >
              <div className="flex items-center justify-between">
                <div key={index} className="flex items-center gap-2">
                  {Icon && <Icon size={20} />}
                  {param.name} (Effect:{" "}
                  {formatting(shap.ranking[param.name], "float", 2)})
                </div>
                <div className="flex gap-2">
                  <LuChartBarBig size={20} />

                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary"
                    checked={isToggled}
                    onChange={() => handleToggleChange(param.name)}
                  />
                  <LuChartScatter size={20} />
                </div>
              </div>
              <ImportancePlot param={param} toggle={isToggled} />
            </div>
          );
        })}
    </div>
  );
};

export default HparamEffect;
