import { useExperimentStore } from "../../stores/experimentStore";

import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes, UniformHyperparam } from "../../types";
import { useEffect, useState } from "react";
import { formatting } from "../../utils/formatting";
import ImportancePlot from "../common/ImportancePlot";
import BottomButton from "../common/BottomButton";
import { GrContract } from "react-icons/gr";
import * as uuid from "uuid";
import ApiClient from "../../api/api";
import { useNavigation } from "../../hooks/useNavigation";
import CheckBox from "../common/CheckBox";
const Records = () => {
  const shap = useExperimentStore((state) => state.shap);
  const hyperparams = useExperimentStore((state) => state.hyperparams);

  const selectedTrials = useExperimentStore((state) => state.selectedTrials);
  const setSelectedTrials = useExperimentStore(
    (state) => state.setSelectedTrials
  );

  const [narrowValues, setNarrowValues] = useState<
    Record<string, (string | number | boolean)[]>
  >({});

  const { handleNavigate } = useNavigation();

  useEffect(() => {
    if (selectedTrials.length > 0 && hyperparams) {
      console.log("Selected Trials:", selectedTrials);
      const initialValues: Record<string, string[] | number[] | boolean[]> = {};
      hyperparams.forEach((hp) => {
        const narrowValue = selectedTrials
          .map((trial) => {
            return trial[hp.name] || [];
          })
          .flat();
        if (hp.type === HyperparamTypes.Uniform) {
          console.log("Narrow Value for", hp.name, ":", narrowValue);

          initialValues[hp.name] = [
            Math.min(...narrowValue.map(Number)),
            Math.max(...narrowValue.map(Number)),
          ];
        } else {
          initialValues[hp.name] = narrowValue
            .filter((value) => value !== undefined && value !== null)
            .map((val) =>
              val === "True" ? true : val === "False" ? false : val
            );
        }
      });
      setNarrowValues(initialValues);
    } else if (hyperparams) {
      const initialValues: Record<string, string[] | number[]> = {};
      hyperparams.forEach((hp) => {
        if (hp.beforeChange) {
          initialValues[hp.name] = hp.narrowValue || [];
        }
      });
      setNarrowValues(initialValues);
    }
  }, [hyperparams, selectedTrials]);

  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      {/* <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text={"Excluded hyperparameters"} />
      </div> */}
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        {shap?.shapValues.map((param, index) => {
          const Icon =
            hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;

          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [toggle, setToggle] = useState(false);
          const hp = hyperparams?.find(
            (h) => h.name === param.name && h.type === param.type
          );
          return (
            <div
              className="flex flex-col gap-2 border-b border-gray-300 pt-2 pb-4"
              key={index}
            >
              <div className="flex items-center justify-between">
                <div key={index} className="flex items-center gap-2">
                  {Icon && <Icon size={20} />}
                  {param.name} (
                  {formatting(shap.ranking[param.name], "float", 2)})
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={toggle}
                  onChange={() => {
                    setToggle(!toggle);
                  }}
                />
              </div>
              <ImportancePlot param={param} toggle={toggle} />
              <div className="flex gap-1 w-full justify-around">
                {hp?.type === HyperparamTypes.Uniform ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      className={`input input-sm focus:ring-0 focus:outline-none ${
                        narrowValues[param.name]?.[0] >=
                        narrowValues[param.name]?.[1]
                          ? "input-error"
                          : "focus:input-primary"
                      }`}
                      value={Number(narrowValues[param.name]?.[0])}
                      onChange={(e) => {
                        setNarrowValues((prev) => ({
                          ...prev,
                          [param.name]: [
                            Number(e.target.value),
                            prev[param.name]?.[1] || 0,
                          ],
                        }));
                      }}
                      placeholder="Min"
                    />
                    <p className="text-sm">-</p>
                    <input
                      type="number"
                      className={`input input-sm focus:ring-0 focus:outline-none ${
                        narrowValues[param.name]?.[1] <=
                        narrowValues[param.name]?.[0]
                          ? "input-error"
                          : "focus:input-primary"
                      }`}
                      value={Number(narrowValues[param.name]?.[1])}
                      onChange={(e) => {
                        setNarrowValues((prev) => ({
                          ...prev,
                          [param.name]: [
                            prev[param.name]?.[0] || 0,
                            Number(e.target.value),
                          ],
                        }));
                      }}
                      placeholder="Max"
                    />
                  </div>
                ) : (
                  hp?.narrowValue &&
                  hp.narrowValue.map(
                    (before: string | number | boolean, idx: number) => (
                      <CheckBox
                        label={before.toString()}
                        key={idx}
                        checked={
                          narrowValues[param.name]?.includes(before) ?? false
                        }
                        disabled={
                          (narrowValues[param.name]?.length === 1 &&
                            narrowValues[param.name]?.includes(before)) ||
                          !hp.narrowValue?.includes(before)
                        }
                        onChange={(e) => {
                          setNarrowValues((prev) => {
                            const newValues = [...(prev[param.name] || [])];
                            if (e.target.checked) {
                              newValues.push(before);
                            } else {
                              const index = newValues.indexOf(before);
                              if (index > -1) {
                                newValues.splice(index, 1);
                              }
                            }
                            return {
                              ...prev,
                              [param.name]: newValues,
                            };
                          });
                        }}
                      />
                    )
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
      <BottomButton
        icon={<GrContract size={16} />}
        onClick={() => {
          const id = uuid.v4(); // Generate a new unique ID for the trial
          const space: (
            | {
                name: string;
                value: null;
                lower: number;
                upper: number;
                mean: null;
                sigma: null;
              }
            | {
                name: string;
                value: any;
                lower: null;
                upper: null;
                mean: null;
                sigma: null;
              }
          )[] = [];
          hyperparams?.map((param) => {
            if (param.checkSpaceChange(narrowValues[param.name])) {
              if (param instanceof UniformHyperparam) {
                space.push(
                  param.toNarrow(narrowValues[param.name] as [number, number])
                );
              } else {
                // beforeNarrowSet 에다가 narrowValues를 뺀 값을 전송해야 함, 즉 교집합이 아닌 것
                const filteredValue = param.narrowValue.filter(
                  (value: string | number | boolean) =>
                    !narrowValues[param.name].includes(value)
                );
                space.push(param.toNarrow(filteredValue));
              }
            }
          });
          const data = {
            id: id,
            config: space,
          };
          setSelectedTrials([]); // Clear selected trials after narrowing
          ApiClient.narrowConfigspace(data);

          handleNavigate("/main/refine");

          // console.log("Narrowed Hyperparameter Space:", space);
        }}
        text="Narrow the hyperparameter space"
      />
    </div>
  );
};

export default Records;
