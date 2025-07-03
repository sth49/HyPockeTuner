import { useExperimentStore } from "../../stores/experimentStore";
import HeaderText from "../common/HeaderText";

import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes } from "../../types";
import ImportancePlot from "../common/ImportancePlot";
import { formatting } from "../../utils/utils";
import { useState } from "react";
const HparamEffect = () => {
  const hyperparams = useExperimentStore((state) => state.hyperparams) ?? [];
  const shap = useExperimentStore((state) => state.shap);
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
  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
      <div className="flex items-center justify-between">
        <HeaderText text="Hyperparameter Effects" />
        <p>{formatting(shap?.baseValue ?? 0, "float", 2)}</p>
      </div>

      {shap?.shapValues.map((param, index) => {
        const Icon =
          hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [toggle, setToggle] = useState(false);
        return (
          <div
            className="flex flex-col gap-2 border-b border-gray-300 pt-2 pb-4"
            key={index}
          >
            <div className="flex items-center justify-between">
              <div key={index} className="flex items-center gap-2">
                {Icon && <Icon size={20} />}
                {param.name} ({formatting(shap.ranking[param.name], "float", 2)}
                )
              </div>
              <input
                type="checkbox"
                // className="toggle toggle-primary toggle-sm"

                className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                checked={toggle}
                onChange={() => {
                  setToggle(!toggle);
                }}
              />
            </div>
            <ImportancePlot param={param} toggle={toggle} />
          </div>
        );
      })}
    </div>
  );
};
export default HparamEffect;
