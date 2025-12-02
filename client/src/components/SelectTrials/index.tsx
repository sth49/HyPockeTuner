import { useNavigation } from "../../hooks/useNavigation";
import TrialTable from "../common/TrialTable";
import { useTrialData } from "../../hooks/useTrialData";
import BottomButton from "../common/BottomButton";
import HeaderText from "../common/HeaderText";
import { FaCheck } from "react-icons/fa";
import { useParams } from "react-router";
import { useExperimentStore } from "../../stores/experimentStore";
import { TrialRowType } from "../../types";
import { useEffect } from "react";
const SelectTrials = () => {
  const { rowSelection, setRowSelection, table, isLoading } = useTrialData(
    false,
    true
  );
  const { handleNavigate } = useNavigation();
  const { type } = useParams<{ type: string }>();
  const selectedTrials = useExperimentStore((state) => state.selectedTrials);
  const setSelectedTrials = useExperimentStore(
    (state) => state.setSelectedTrials
  );

  const handleRowClick = (trialId: string) => {
    setRowSelection((prev) => {
      const newSelection: Record<string, boolean> = {
        ...(typeof prev === "object" && prev !== null ? prev : {}),
      };
      if (newSelection[trialId]) {
        delete newSelection[trialId];
      } else {
        newSelection[trialId] = true;
      }
      return newSelection;
    });
  };

  useEffect(() => {
    const tableRows = table.getRowModel().rows;

    if (tableRows.length === 0 || selectedTrials.length === 0) {
      console.log("Table rows or selectedTrials not ready:", {
        tableRowsLength: tableRows.length,
        selectedTrialsLength: selectedTrials.length,
      });
      return;
    }

    const newSelection: Record<string, boolean> = {};
    const selectedTrialIds = selectedTrials.map((trial) => trial.id);

    selectedTrialIds.forEach((trialId) => {
      newSelection[trialId] = true;
    });

    setRowSelection(newSelection);
  }, [selectedTrials, table.getRowModel().rows.length, setRowSelection]);

  if (isLoading && table.getRowModel().rows.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div>Loading trials...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      <div className="w-full h-full flex gap-1.5 items-between flex-col bg-white">
        <div className="flex items-center justify-between p-4">
          <HeaderText
            text={
              <>
                Choose at least 3 trials that will be included in the space (
                <FaCheck className="inline mx-1" />
                {rowSelection ? Object.keys(rowSelection).length : 0})
              </>
            }
          />
        </div>

        <div className="w-full overflow-auto pb-0 bg-white flex-1 border-t-[1px] border-t-[#e0e0e0]">
          <TrialTable table={table} handleRowClick={handleRowClick} />
        </div>
      </div>
      <BottomButton
        text="Generate Hyperparameter Space"
        icon={<FaCheck />}
        onClick={() => {
          if (Object.keys(rowSelection).length < 3) {
            alert("Please select at least 3 trials.");
            return;
          }
          const selectedRows: TrialRowType[] = [];
          const allRows = table.getRowModel().rows;

          Object.keys(rowSelection).forEach((trialId) => {
            if (rowSelection[trialId]) {
              const trial = allRows.find(row => row.original && row.original.id === trialId)?.original;
              if (trial) {
                selectedRows.push(trial);
              }
            }
          });
          
          console.log("Selected Trials:", selectedRows);
          setSelectedTrials(selectedRows);

          if (type === "narrow") {
            handleNavigate("/refine/narrow/hpspace");
          } else if (type === "redefine") {
            handleNavigate("/experiment/new/1/redefine");
          } else {
            alert("Invalid type parameter. Please check the URL.");
            return;
          }
        }}
        disabled={Object.keys(rowSelection).length < 3}
      />
    </div>
  );
};

export default SelectTrials;
