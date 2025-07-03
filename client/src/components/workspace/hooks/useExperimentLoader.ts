import { useCallback } from "react";
import { useExperimentStore } from "../../../stores/experimentStore";
import { useNavigation } from "../../../hooks/useNavigation";
import ApiClient from "../../../api/api";

export const useExperimentLoader = () => {
  const initializeExperiment = useExperimentStore(
    (state) => state.initializeExperiment
  );
  const processEvents = useExperimentStore((state) => state.processEvents);
  const { handleNavigate } = useNavigation();

  const loadExperiment = useCallback(
    async (experimentId: string) => {
      try {
        const response = await ApiClient.call([`exp/get/${experimentId}`]);
        console.log("load_information", response);

        const experimentData = response[0];
        initializeExperiment(experimentData);
        processEvents(experimentData.allCallbacks);

        handleNavigate("/main/overview");
      } catch (error) {
        console.error("Failed to load experiment:", error);
        // 에러 처리 로직 추가 가능
      }
    },
    [initializeExperiment, processEvents, handleNavigate]
  );

  return { loadExperiment };
};
