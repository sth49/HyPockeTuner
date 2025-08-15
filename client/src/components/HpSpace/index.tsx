import { useExperimentStore } from "../../stores/experimentStore";

import { hpTypeIcons } from "../../utils/icon";
import { HyperparamTypes, UniformHyperparam } from "../../types";
import { useEffect, useState, useMemo } from "react";
import { formatting } from "../../utils/formatting";
import ImportancePlot from "../common/ImportancePlot";
import BottomButton from "../common/BottomButton";
import { GrContract } from "react-icons/gr";
import * as uuid from "uuid";
import ApiClient from "../../api/api";
import { useNavigation } from "../../hooks/useNavigation";
import CheckBox from "../common/CheckBox";
import UniformImportancePlot from "../common/UniformImportancePlot";
import HeaderText from "../common/HeaderText";
import { useMetadataStore } from "../../stores/metadataStore";
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

  const expId = useExperimentStore((state) => state.expId);
  const expList = useMetadataStore((state) => state.expList);
  const expData = expList.find((exp) => exp.id === expId) || null;
  const hparamList = expData ? expData.hparamList : [];

  // State for toggle values for each parameter
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  const { handleNavigate } = useNavigation();

  // Track changed hyperparameters
  const changedHyperparams = useMemo(() => {
    if (!hyperparams) return [];

    return hyperparams.filter((param) => {
      const paramValues = narrowValues[param.name];
      // Check if paramValues exists and is not empty before calling checkSpaceChange
      if (!paramValues || paramValues.length === 0) return false;
      return param.checkSpaceChange(paramValues);
    });
  }, [hyperparams, narrowValues]);

  // Check if any hyperparameter has changed
  const hasChanges = changedHyperparams.length > 0;

  // Check for validation errors in uniform hyperparameters
  const hasValidationErrors = useMemo(() => {
    if (!shap?.shapValues || !hyperparams) return false;

    return shap.shapValues.some((param) => {
      if (param.type === HyperparamTypes.Uniform) {
        const values = narrowValues[param.name];
        if (!values || values.length < 2) return false;

        const hp = hyperparams.find(
          (h) => h.name === param.name && h.type === param.type
        );
        if (!hp) return false;

        const min = Number(values[0]);
        const max = Number(values[1]);
        const originalMin = hp.narrowValue[0];
        const originalMax = hp.narrowValue[1];

        // Check for various error conditions
        return (
          min >= max || // Min should be less than max
          min < originalMin || // Min should not be below original range
          max > originalMax || // Max should not be above original range
          isNaN(min) || // Min should be a valid number
          isNaN(max) // Max should be a valid number
        );
      }
      return false;
    });
  }, [shap?.shapValues, hyperparams, narrowValues]);

  useEffect(() => {
    if (selectedTrials.length > 0 && hyperparams) {
      const initialValues: Record<string, string[] | number[] | boolean[]> = {};
      hyperparams.forEach((hp) => {
        const narrowValue = selectedTrials
          .map((trial) => {
            return trial[hp.name] || [];
          })
          .flat();
        if (hp.type === HyperparamTypes.Uniform) {
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
      {/* Display changed hyperparameters at the top */}
      {hasChanges && (
        <div className="w-full flex gap-1.5 items-between flex-col bg-blue-50 border border-blue-200 rounded p-4">
          <HeaderText text="Changed Hyperparameters" />
          <div className="flex flex-wrap gap-2">
            {changedHyperparams.map((param) => {
              const Icon =
                hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;
              return (
                <div
                  key={param.name}
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                >
                  {Icon && <Icon size={14} />}
                  {param.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        {shap?.shapValues
          ? shap.shapValues.map((param, index) => {
              // const Icon =
              //   hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;

              const parameter = hyperparams?.find(
                (hp) => hp.name === param.name
              );
              const Icon =
                parameter && hparamList.includes(parameter.name)
                  ? hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] ||
                    null
                  : hpTypeIcons.constant;

              const toggle = toggleStates[param.name] || false;
              const setToggle = (value: boolean) => {
                setToggleStates((prev) => ({
                  ...prev,
                  [param.name]: value,
                }));
              };

              return (
                <div
                  className="flex flex-col gap-2 border-b border-gray-300 pt-2 pb-4"
                  key={index}
                >
                  <div className="flex items-center justify-between">
                    <div key={index} className="flex items-center gap-2">
                      {Icon && <Icon size={20} />}
                      <p>{param.name}</p>
                      {/* {formatting(shap.ranking[param.name], "float", 2)}) */}
                      <p>
                        {parameter &&
                          hparamList.includes(parameter.name) &&
                          "(Effect: " +
                            formatting(shap.ranking[param.name], "float", 2) +
                            ")"}
                      </p>
                    </div>
                    {parameter && hparamList.includes(parameter.name) ? (
                      <input
                        type="checkbox"
                        className="toggle toggle-sm toggle-primary"
                        checked={toggle}
                        onChange={() => {
                          setToggle(!toggle);
                        }}
                      />
                    ) : (
                      parameter && (
                        <span className="btn btn-xs h-[20px] btn-primary btn-outline rounded-full w-[60px]">
                          {parameter.constantValue.toString()}
                        </span>
                      )
                    )}
                  </div>
                  {parameter && hparamList.includes(parameter.name) ? (
                    param.type !== HyperparamTypes.Uniform ? (
                      <ImportancePlot param={param} toggle={toggle} />
                    ) : (
                      <UniformImportancePlot param={param} toggle={toggle} />
                    )
                  ) : null}
                  <div className="flex gap-1 w-full justify-around">
                    {parameter && hparamList.includes(parameter.name) ? (
                      parameter?.type === HyperparamTypes.Uniform ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="number"
                            className={`input input-sm focus:ring-0 focus:outline-none ${(() => {
                              const values = narrowValues[param.name];
                              if (!values || values.length < 2)
                                return "focus:input-primary";

                              const min = Number(values[0]);
                              const max = Number(values[1]);
                              const originalMin = parameter?.narrowValue?.[0];

                              return min >= max ||
                                (originalMin !== undefined &&
                                  min < originalMin) ||
                                isNaN(min)
                                ? "input-error"
                                : "focus:input-primary";
                            })()}`}
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
                            className={`input input-sm focus:ring-0 focus:outline-none ${(() => {
                              const values = narrowValues[param.name];
                              if (!values || values.length < 2)
                                return "focus:input-primary";

                              const min = Number(values[0]);
                              const max = Number(values[1]);
                              const originalMax = parameter?.narrowValue?.[1];

                              return max <= min ||
                                (originalMax !== undefined &&
                                  max > originalMax) ||
                                isNaN(max)
                                ? "input-error"
                                : "focus:input-primary";
                            })()}`}
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
                        parameter?.narrowValue &&
                        parameter.narrowValue.map(
                          (before: string | number | boolean, idx: number) => (
                            <CheckBox
                              label={before.toString()}
                              key={idx}
                              checked={
                                narrowValues[param.name]?.includes(before) ??
                                false
                              }
                              disabled={
                                (narrowValues[param.name]?.length === 1 &&
                                  narrowValues[param.name]?.includes(before)) ||
                                !parameter.narrowValue?.includes(before)
                              }
                              onChange={(e) => {
                                setNarrowValues((prev) => {
                                  const newValues = [
                                    ...(prev[param.name] || []),
                                  ];
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
                      )
                    ) : null}
                  </div>
                </div>
              );
            })
          : null}
      </div>
      <BottomButton
        icon={<GrContract size={16} />}
        disabled={!hasChanges || hasValidationErrors}
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
