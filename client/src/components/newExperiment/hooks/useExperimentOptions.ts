import { useMetadataStore } from "../../../stores/metadataStore";
import { HyperparamOption } from "../../../models/HyperparameterOption";
import { useEffect } from "react";
import { useExperimentStore } from "../../../stores/experimentStore";
import { HyperparamTypes } from "../../../types";

export const useExperimentOptions = (type: string) => {
  const expOption = useMetadataStore((state) => state.expOptions);
  const defaultExpOptions = useMetadataStore(
    (state) => state.defaultExpOptions
  );
  const newExpOptions = useMetadataStore((state) => state.newExpOptions);
  const setNewExpOptions = useMetadataStore((state) => state.setNewExpOptions);
  const name = useExperimentStore((state) => state.name);
  const model = useExperimentStore((state) => state.model);
  const dataset = useExperimentStore((state) => state.dataset);
  const bohb = useExperimentStore((state) => state.bohb);
  const metric = useExperimentStore((state) => state.metric);
  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const selectedTrials = useExperimentStore((state) => state.selectedTrials);

  // const

  useEffect(() => {
    console.log("newExpOptions updated:", newExpOptions);
    if (type === "redefine") {
      console.log("Redefine experiment options initialized");
      console.log("Redefine experiment options initialized");
      const newHparamOptions = expOption?.all_hyperparameters?.[dataset]?.map(
        (hparam: any, index: number) =>
          HyperparamOption.fromJSON(hparam.name, index, hparam)
      );
      console.log("newHparamOptions:", newHparamOptions);

      newHparamOptions?.forEach((hparam: HyperparamOption) => {
        const hp = hyperparams?.find((hp) => hp.name === hparam.name);
        hparam.initialize(hp?.narrowValue, hp?.type);
      });

      if (selectedTrials.length > 0) {
        newHparamOptions?.forEach((hparam: HyperparamOption) => {
          const hp = hyperparams?.find((hp) => hp.name === hparam.name);
          const narrowValue = Array.from(
            new Set(
              selectedTrials
                .map((trial) => {
                  return trial[hparam.name] || [];
                })

                .flat()
            )
          ).map((val) =>
            "True" === val ? true : "False" === val ? false : val
          );
          if (
            hp?.type === HyperparamTypes.Ordinal ||
            hp?.type === HyperparamTypes.Uniform
          ) {
            hparam.initialize(
              narrowValue.map((v) => Number(v)).sort((a, b) => a - b),
              hp?.type
            );
          } else {
            hparam.initialize(narrowValue, hp?.type);
          }
        });
      }

      console.log("newHparamOptions:", newHparamOptions);

      const initialOptions = {
        name: "From " + name || "",
        dataset: dataset || "",
        model: model || "",
        hyperparams: newHparamOptions || [],

        metric: metric,
        bohb: {
          eta: bohb.eta || 3,
          minBudget: bohb.minBudget || 1,
          maxBudget: bohb.maxBudget || 81,
        },
      };
      setNewExpOptions(initialOptions);
    } else {
      setNewExpOptions(defaultExpOptions);
    }
  }, []);

  const datasetOptions =
    expOption?.dataset?.map((name: string) => ({
      value: name,
      label: name,
    })) || [];

  const modelOptions =
    newExpOptions.dataset && expOption?.dataset_model?.[newExpOptions.dataset]
      ? expOption.dataset_model[newExpOptions.dataset].map((name: string) => ({
          value: name,
          label: name,
        }))
      : [];

  const handleNameChange = (name: string) => {
    setNewExpOptions({ ...newExpOptions, name });
  };

  const handleDatasetChange = (
    selection: { value: string; label: string } | null
  ) => {
    if (!selection || !expOption) return;

    const newDataset = selection.value;
    const newModel = expOption.dataset_model[newDataset][0];
    const newHyperparams = expOption.all_hyperparameters[newDataset].map(
      (hparam: any, i: number) =>
        HyperparamOption.fromJSON(hparam.name, i, hparam)
    );
    const newMetric = expOption.model_config[newModel].metric;

    setNewExpOptions({
      ...newExpOptions,
      dataset: newDataset,
      model: newModel,
      hyperparams: newHyperparams,
      metric: newMetric,
    });
  };

  const handleModelChange = (
    selection: { value: string; label: string } | null
  ) => {
    if (!selection || !expOption) return;

    const newModel = selection.value;
    const newMetric = expOption.model_config[newModel].metric;

    setNewExpOptions({
      ...newExpOptions,
      model: newModel,
      metric: newMetric,
    });
  };

  const handleEtaChange = (eta: number) => {
    setNewExpOptions({
      ...newExpOptions,
      bohb: {
        ...newExpOptions.bohb,
        eta,
        minBudget: eta ** 0,
        maxBudget: eta ** 4,
      },
    });
  };

  const handleMinBudgetChange = (minBudget: number) => {
    setNewExpOptions({
      ...newExpOptions,
      bohb: { ...newExpOptions.bohb, minBudget },
    });
  };

  const handleMaxBudgetChange = (maxBudget: number) => {
    setNewExpOptions({
      ...newExpOptions,
      bohb: { ...newExpOptions.bohb, maxBudget },
    });
  };

  return {
    expOption,
    newExpOptions,
    datasetOptions,
    modelOptions,
    handlers: {
      handleNameChange,
      handleDatasetChange,
      handleModelChange,
      handleEtaChange,
      handleMinBudgetChange,
      handleMaxBudgetChange,
    },
  };
};
