import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";
import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";
import ImportancePlot from "../common/ImportancePlot";
import { formatting } from "../../utils/formatting";
import { useState } from "react";
import UniformImportancePlot from "../common/UniformImportancePlot";
const HparamEffect = () => {
  const hyperparams = useExperimentStore((state) => state.hyperparams) ?? [];
  const shap = useExperimentStore((state) => state.shap);
  // const hparamList = expData ? expData.hparamList : [];
  const hparamList = hyperparams
    .filter((hp) => !hp.getIsConstant())
    .map((hp) => hp.name);

  // 모든 파라미터의 toggle 상태를 하나의 객체로 관리
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  if (
    hyperparams.length === 0 ||
    !shap?.shapValues ||
    shap.shapValues.length === 0
  ) {
    return (
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="Hyperparameter Effects" />
        <div className="text-gray-500 text-center py-8">
          <p>No hyperparameter effects to display yet.</p>
          <p className="text-sm mt-2">
            Results will appear as the experiment progresses.
          </p>
        </div>
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

      {shap?.shapValues.slice().map((param, index) => {
        if (hparamList.includes(param.name) === false) return null;
        const parameter = hyperparams.find((hp) => hp.name === param.name);
        const Icon =
          parameter && hparamList.includes(parameter.name)
            ? hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null
            : hpTypeIcons.constant;

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
                <div>
                  <p>{param.name}</p>
                  <p>
                    {parameter &&
                      hparamList.includes(parameter.name) &&
                      "(Effect: " +
                        formatting(shap.ranking[param.name], "float", 2) +
                        ")"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {/* <LuChartBarBig size={20} /> */}
                {parameter && hparamList.includes(parameter.name) ? (
                  <>
                    <span className="text-xs">Show individual trials</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary"
                      checked={isToggled}
                      onChange={() => handleToggleChange(param.name)}
                    />
                  </>
                ) : (
                  parameter && (
                    <span className="btn btn-xs h-[20px] btn-primary btn-outline rounded-full w-[60px]">
                      {parameter.constantValue.toString()}
                    </span>
                  )
                )}
              </div>
            </div>
            {parameter && hparamList.includes(parameter.name) ? (
              param.type !== HyperparamTypes.Uniform ? (
                <ImportancePlot param={param} toggle={isToggled} />
              ) : (
                <UniformImportancePlot param={param} toggle={isToggled} />
              )
            ) : (
              <></>
            )}
          </div>
        );
      })}
      {shap?.shapValues.slice().map((param, index) => {
        if (hparamList.includes(param.name)) return null;
        const parameter = hyperparams.find((hp) => hp.name === param.name);
        const Icon =
          parameter && hparamList.includes(parameter.name)
            ? hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null
            : hpTypeIcons.constant;

        return (
          <div
            className="flex flex-col gap-2 border-b border-gray-300 pt-2 pb-4"
            key={index}
          >
            <div className="flex items-center justify-between">
              <div key={index} className="flex items-center gap-2">
                {Icon && <Icon size={20} />}
                <div>
                  <p>{param.name}</p>
                  <p>
                    {parameter &&
                      hparamList.includes(parameter.name) &&
                      "(Effect: " +
                        formatting(shap.ranking[param.name], "float", 2) +
                        ")"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {/* <LuChartBarBig size={20} /> */}
                {parameter && (
                  <span className="btn btn-xs h-[20px] btn-primary btn-outline rounded-full w-[60px]">
                    {parameter.constantValue.toString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HparamEffect;
