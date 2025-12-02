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
import { RxReset } from "react-icons/rx";
// Function to format number with scientific notation for small/large values
const formatNumberForDisplay = (value: number | string | boolean): string => {
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "string") return value;

  const num = Number(value);
  if (isNaN(num)) return value.toString();

  // Use scientific notation for very small or very large numbers
  if ((num < 0.001 && num > 0) || num > 1000) {
    return num.toExponential().replace("+", "");
  } else if (num === 0) {
    return "0";
  } else {
    return num.toString();
  }
};

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

  // const expId = useExperimentStore((state) => state.expId);
  // const expList = useMetadataStore((state) => state.expList);
  // const expData = expList.find((exp) => exp.id === expId) || null;
  // const hparamList = useMemo(
  //   () => (expData ? expData.hparamList : []),
  //   [expData]
  // );

  const hparamList = (hyperparams ?? [])
    .filter((hp) => !hp.getIsConstant())
    .map((hp) => hp.name);

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

  // Check if there are any valid narrow values to process
  const hasValidNarrowValues = useMemo(() => {
    if (!hyperparams) return false;

    return hyperparams.some((param) => {
      if (!hparamList.includes(param.name)) return false;

      const values = narrowValues[param.name];
      if (!values || values.length === 0) return false;

      if (param.type === HyperparamTypes.Uniform) {
        if (values.length !== 2) return false;
        if (
          values[0] === "" ||
          values[0] === null ||
          values[0] === undefined ||
          values[1] === "" ||
          values[1] === null ||
          values[1] === undefined
        ) {
          return false;
        }
        return true;
      } else {
        return values.length > 0;
      }
    });
  }, [hyperparams, narrowValues, hparamList]);

  // Function to check if a specific parameter has changed
  const isParameterChanged = (paramName: string) => {
    const param = hyperparams?.find((hp) => hp.name === paramName);
    if (!param) return false;

    const paramValues = narrowValues[paramName];
    if (!paramValues || paramValues.length === 0) return false;

    return param.checkSpaceChange(paramValues);
  };

  // Function to reset a specific parameter to its original values
  const resetParameter = (paramName: string) => {
    const param = hyperparams?.find((hp) => hp.name === paramName);
    if (!param) return;

    setNarrowValues((prev) => {
      const newValues = { ...prev };

      if (param.beforeChange) {
        // Reset to the original values before any changes
        newValues[paramName] = param.narrowValue || [];
      } else {
        // Remove the parameter from narrowValues if it wasn't changed before
        delete newValues[paramName];
      }

      return newValues;
    });
  };

  // Check for validation errors in hyperparameters
  const hasValidationErrors = useMemo(() => {
    if (!hyperparams) return false;

    const errors = hyperparams.filter((param) => {
      // Skip constants (parameters not in hparamList)
      if (!hparamList.includes(param.name)) return false;

      const values = narrowValues[param.name];

      // If no values are set, no validation error
      if (!values || values.length === 0) return false;

      if (param.type === HyperparamTypes.Uniform) {
        // Must have exactly 2 values for uniform parameters
        // if (values.length !== 2) {
        //   console.log(
        //     `Validation error in ${param.name}: incorrect number of values (${values.length})`
        //   );
        //   return true;
        // }

        // Check for empty values
        // if (
        //   values[0] === "" ||
        //   values[0] === undefined ||
        //   values[0] === null ||
        //   values[1] === "" ||
        //   values[1] === undefined ||
        //   values[1] === null
        // ) {
        //   console.log(
        //     `Validation error in ${param.name}: empty values`,
        //     values
        //   );
        //   return true;
        // }

        const min = Number(values[0]);
        const max = Number(values[1]);
        const originalMin = Number(param.narrowValue[0]);
        const originalMax = Number(param.narrowValue[1]);

        // Check for various error conditions
        if (isNaN(min)) {
          console.log(`Validation error in ${param.name}: min is NaN`);
          return true;
        }
        if (isNaN(max)) {
          console.log(`Validation error in ${param.name}: max is NaN`);
          return true;
        }
        if (min >= max) {
          console.log(
            `Validation error in ${param.name}: min (${min}) >= max (${max})`
          );
          return true;
        }
        if (min < originalMin) {
          console.log(
            `Validation error in ${param.name}: min (${min}) < originalMin (${originalMin})`
          );
          return true;
        }
        if (max > originalMax) {
          console.log(
            `Validation error in ${param.name}: max (${max}) > originalMax (${originalMax})`
          );
          return true;
        }
        return false;
      } else {
        // For non-uniform parameters, check that selected values are valid
        const allValid = values.every((value) =>
          param.narrowValue.some(
            (original: any) =>
              original === value || original?.toString() === value?.toString()
          )
        );

        if (!allValid) {
          console.log(
            `Validation error in ${param.name}: invalid values`,
            values,
            "not in",
            param.narrowValue
          );
        }

        return !allValid;
      }
    });

    if (errors.length > 0) {
      console.log(
        "Parameters with validation errors:",
        errors.map((p) => p.name)
      );
    }

    return errors.length > 0;
  }, [hyperparams, narrowValues, hparamList]);

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
          // Filter out values that are not in the current narrowValue and remove duplicates
          const uniqueValues = Array.from(
            new Set(
              narrowValue
                .filter((value) => value !== undefined && value !== null)
                .map((val) =>
                  val === "True" ? true : val === "False" ? false : val
                )
                .map((val) =>
                  typeof val === "boolean" ? val.toString() : val?.toString()
                )
            )
          ).map((val) =>
            val === "true" ? true : val === "false" ? false : val
          );

          const filteredValues = uniqueValues.filter(
            (val) =>
              hp.narrowValue &&
              hp.narrowValue.some(
                (allowed: any) =>
                  allowed === val || allowed?.toString() === val?.toString()
              )
          );

          // If no values are selected (all were excluded), select all available values
          if (
            filteredValues.length === 0 &&
            hp.narrowValue &&
            hp.narrowValue.length > 0
          ) {
            initialValues[hp.name] = [...hp.narrowValue];
          } else {
            initialValues[hp.name] = filteredValues;
          }
        }
      });
      setNarrowValues(initialValues);
    } else if (hyperparams) {
      const initialValues: Record<string, string[] | number[] | boolean[]> = {};
      hyperparams.forEach((hp) => {
        if (hp.beforeChange) {
          // For discrete types, set all available values as selected by default
          if (hp.type !== HyperparamTypes.Uniform && hp.narrowValue) {
            // Remove duplicates and set all unique narrowValue items as selected initially
            const uniqueStringValues = Array.from(
              new Set(
                hp.narrowValue.map((val: any) =>
                  typeof val === "boolean" ? val.toString() : val?.toString()
                )
              )
            );
            const uniqueValues = uniqueStringValues.map((val) =>
              val === "true" ? true : val === "false" ? false : val
            );
            initialValues[hp.name] = uniqueValues as
              | string[]
              | number[]
              | boolean[];
          } else {
            initialValues[hp.name] = hp.narrowValue || [];
          }
        }
      });
      setNarrowValues(initialValues);
    }
  }, [hyperparams, selectedTrials]);

  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      {/* Display changed hyperparameters at the top */}
      {hasChanges && (
        <div className="w-full flex gap-1.5 items-between flex-col bg-white  p-4">
          <div className="flex items-center justify-between">
            <HeaderText text="Changed Hyperparameters" />
            <button
              onClick={() => {
                // Reset all changed parameters
                changedHyperparams.forEach((param) => {
                  resetParameter(param.name);
                });
              }}
              className="btn btn-xs btn-error text-white rounded-full"
            >
              <RxReset size={16} />
              Reset All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {changedHyperparams.map((param) => {
              const Icon =
                hpTypeIcons[HyperparamTypes[param.type].toLowerCase()] || null;
              return (
                <button
                  key={param.name}
                  className="flex items-center gap-1 border px-2 py-1 rounded-md text-sm btn-error btn btn-outline"
                  onClick={() => resetParameter(param.name)}
                  aria-label={`Reset ${param.name}`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{param.name}</span>

                  {/* <MdOutlineChangeCircle size={12} /> */}
                  <RxReset />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        {shap?.shapValues
          ? (() => {
              // Separate constants and non-constants
              const nonConstants = shap.shapValues.filter((param) => {
                const parameter = hyperparams?.find(
                  (hp) => hp.name === param.name
                );
                return parameter && hparamList.includes(parameter.name);
              });

              const constants = shap.shapValues.filter((param) => {
                const parameter = hyperparams?.find(
                  (hp) => hp.name === param.name
                );
                return parameter && !hparamList.includes(parameter.name);
              });

              // Combine with non-constants first, then constants
              const allParams = [...nonConstants, ...constants];

              return allParams;
            })().map((param, index) => {
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
                      <div className="flex items-center gap-2">
                        <p>{param.name}</p>
                      </div>
                      {/* {formatting(shap.ranking[param.name], "float", 2)}) */}
                      <p>
                        {parameter &&
                          hparamList.includes(parameter.name) &&
                          "(Effect: " +
                            formatting(shap.ranking[param.name], "float", 2) +
                            ")"}
                      </p>
                      {isParameterChanged(param.name) && (
                        <button
                          onClick={() => resetParameter(param.name)}
                          className="btn btn-xs btn-error text-white rounded-full"
                          data-tip="Reset to original values"
                          aria-label={`Reset ${param.name} to original values`}
                        >
                          <RxReset />
                        </button>
                      )}
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
                          {formatNumberForDisplay(parameter.constantValue)}
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
                  <div className="flex flex-wrap gap-2 w-full">
                    {parameter && hparamList.includes(parameter.name) ? (
                      parameter?.type === HyperparamTypes.Uniform ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="number"
                            className={`input input-sm focus:ring-0 focus:outline-none ${(() => {
                              const values = narrowValues[param.name];
                              if (!values || values.length < 2)
                                return "border-gray-300 focus:border-primary";

                              const min = Number(values[0]);
                              const max = Number(values[1]);
                              const originalMin = parameter?.narrowValue?.[0];

                              // Check for validation errors
                              if (
                                values[0] === "" ||
                                values[0] === undefined ||
                                values[0] === null
                              ) {
                                return "border-error focus:border-error";
                              }

                              if (
                                isNaN(min) ||
                                min >= max ||
                                (originalMin !== undefined && min < originalMin)
                              ) {
                                return "border-error focus:border-error";
                              }

                              return "border-gray-300 focus:border-primary";
                            })()}`}
                            value={
                              narrowValues[param.name]?.[0] !== undefined &&
                              narrowValues[param.name]?.[0] !== ""
                                ? Number(narrowValues[param.name][0])
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setNarrowValues((prev) => ({
                                ...prev,
                                [param.name]: [
                                  value ? Number(value) : "",
                                  prev[param.name]?.[1] || 0,
                                ],
                              }));
                            }}
                            placeholder={`Min: ${
                              parameter?.narrowValue?.[0] || ""
                            }`}
                          />
                          <p className="text-sm">-</p>
                          <input
                            type="number"
                            className={`input input-sm focus:ring-0 focus:outline-none ${(() => {
                              const values = narrowValues[param.name];
                              if (!values || values.length < 2)
                                return "border-gray-300 focus:border-primary";

                              const min = Number(values[0]);
                              const max = Number(values[1]);
                              const originalMax = parameter?.narrowValue?.[1];

                              // Check for validation errors
                              if (
                                values[1] === "" ||
                                values[1] === undefined ||
                                values[1] === null
                              ) {
                                return "border-error focus:border-error";
                              }

                              if (
                                isNaN(max) ||
                                max <= min ||
                                (originalMax !== undefined && max > originalMax)
                              ) {
                                return "border-error focus:border-error";
                              }

                              return "border-gray-300 focus:border-primary";
                            })()}`}
                            value={
                              narrowValues[param.name]?.[1] !== undefined &&
                              narrowValues[param.name]?.[1] !== ""
                                ? Number(narrowValues[param.name][1])
                                : ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setNarrowValues((prev) => ({
                                ...prev,
                                [param.name]: [
                                  prev[param.name]?.[0] || 0,
                                  value ? Number(value) : "",
                                ],
                              }));
                            }}
                            placeholder={`Max: ${
                              parameter?.narrowValue?.[1] || ""
                            }`}
                          />
                        </div>
                      ) : (
                        parameter?.narrowValue &&
                        parameter.narrowValue.map(
                          (before: string | number | boolean, idx: number) => (
                            <CheckBox
                              label={formatNumberForDisplay(before)}
                              key={idx}
                              checked={
                                (narrowValues[param.name]?.includes(before) ||
                                  narrowValues[param.name]?.includes(
                                    before.toString()
                                  )) ??
                                false
                              }
                              disabled={(() => {
                                // Value not in current narrowValue - always disabled
                                if (!parameter.narrowValue?.includes(before)) {
                                  return true;
                                }

                                // Get current selected values
                                const currentValues =
                                  narrowValues[param.name] || [];

                                // Count how many values are currently selected
                                const selectedCount = currentValues.filter(
                                  (val) =>
                                    parameter.narrowValue?.some(
                                      (nv: any) =>
                                        nv === val ||
                                        nv?.toString() === val?.toString()
                                    )
                                ).length;

                                // If only 1 value is selected and this is that value, disable it
                                const isThisSelected = currentValues.some(
                                  (val) =>
                                    val === before ||
                                    val?.toString() === before?.toString()
                                );

                                // console.log("SelectedCount: ", selectedCount);
                                // console.log("narrowValues: ", narrowValues);
                                // console.log("isThisSelected: ", isThisSelected);
                                return selectedCount === 1 && isThisSelected;
                              })()}
                              onChange={(e) => {
                                setNarrowValues((prev) => {
                                  const newValues = [
                                    ...(prev[param.name] || []),
                                  ];
                                  if (e.target.checked) {
                                    newValues.push(before);
                                  } else {
                                    // Handle both the value and its string representation
                                    const index = newValues.findIndex(
                                      (v) =>
                                        v === before ||
                                        v?.toString() === before?.toString()
                                    );
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
        disabled={(() => {
          return !hasChanges || !hasValidNarrowValues || hasValidationErrors;
        })()}
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
            // Skip constants (parameters not in hparamList)
            if (!hparamList.includes(param.name)) return;

            const values = narrowValues[param.name];

            // Skip parameters without narrowValues
            if (!values || values.length === 0) return;

            // Only include parameters that have actually changed
            // if (!param.checkSpaceChange(values)) {
            //   console.log(`Skipping ${param.name} - no change detected`);
            //   return;
            // }

            // console.log(
            //   `Including ${param.name} in narrowing - change detected`
            // );

            if (param instanceof UniformHyperparam) {
              // For uniform parameters, validate the values
              if (values.length !== 2) return;

              if (
                values[0] === "" ||
                values[0] === null ||
                values[0] === undefined ||
                values[1] === "" ||
                values[1] === null ||
                values[1] === undefined
              ) {
                return;
              }

              const min = Number(values[0]);
              const max = Number(values[1]);

              if (isNaN(min) || isNaN(max) || min >= max) return;

              const narrowed = param.toNarrow([min, max] as [number, number]);
              space.push(narrowed);
            } else {
              // For non-uniform parameters, find values to exclude
              const valuesToExclude = param.narrowValue.filter(
                (value: string | number | boolean) => {
                  const isSelected = values.some(
                    (selected) =>
                      selected === value ||
                      selected?.toString() === value?.toString()
                  );
                  return !isSelected; // Return true if NOT selected (to exclude)
                }
              );

              // Only send narrowing if we're actually excluding some values
              if (
                valuesToExclude.length > 0 &&
                valuesToExclude.length < param.narrowValue.length
              ) {
                const narrowed = param.toNarrow(valuesToExclude);
                space.push(narrowed);
              }
            }
          });
          const data = {
            id: id,
            config: space,
          };

          console.log("Narrowing config space:", space);

          setSelectedTrials([]); // Clear selected trials after narrowing
          ApiClient.narrowConfigspace(data);

          handleNavigate("/main/refine");
        }}
        text="Narrow the hyperparameter space"
      />
    </div>
  );
};

export default Records;
