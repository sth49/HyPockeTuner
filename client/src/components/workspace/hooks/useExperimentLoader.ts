import { useCallback } from "react";
import { useExperimentStore } from "../../../stores/experimentStore";
import { useNavigation } from "../../../hooks/useNavigation";
import ApiClient from "../../../api/api";

export const useExperimentLoader = () => {
  const initializeExperiment = useExperimentStore(
    (state) => state.initializeExperiment
  );
  const { handleNavigate } = useNavigation();
  const expId = useExperimentStore((state) => state.expId);

  const loadExperiment = useCallback(
    async (experimentId: string) => {
      try {
        if (experimentId === expId) {
          console.log("Experiment already loaded:", experimentId);
        } else {
          const response = await ApiClient.call([`exp/get/${experimentId}`]);

          const experimentData = response[0];
          console.log("Experiment data loaded:", experimentData);
          initializeExperiment(experimentData);
        }
        ApiClient.postVisibility("user1", true).catch((error) => {
          console.error("Failed to send visibility data:", error);
        });

        handleNavigate("/main/trials");
      } catch (error) {
        console.error("Failed to load experiment:", error);
        // 에러 처리 로직 추가 가능
      }
    },
    [expId, handleNavigate, initializeExperiment]
  );

  return { loadExperiment };
};
