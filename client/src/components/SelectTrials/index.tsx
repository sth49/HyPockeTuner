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

  const handleRowClick = (rowId: string) => {
    setRowSelection((prev) => {
      const newSelection: Record<string, boolean> = {
        ...(typeof prev === "object" && prev !== null ? prev : {}),
      };
      if (newSelection[rowId]) {
        delete newSelection[rowId];
      } else {
        newSelection[rowId] = true;
      }
      return newSelection;
    });
  };

  // 테이블 데이터가 준비되고 selectedTrials가 있을 때만 selection 복원
  useEffect(() => {
    const tableRows = table.getRowModel().rows;

    // 테이블에 데이터가 없거나 selectedTrials가 없으면 종료
    if (tableRows.length === 0 || selectedTrials.length === 0) {
      console.log("Table rows or selectedTrials not ready:", {
        tableRowsLength: tableRows.length,
        selectedTrialsLength: selectedTrials.length,
      });
      return;
    }

    const newSelection: Record<string, boolean> = {};
    const selectedTrialIds = selectedTrials.map((trial) => trial.id);

    tableRows.forEach((row) => {
      const rowId = row.id;
      const trialId = row.original.id;
      if (selectedTrialIds.includes(trialId)) {
        newSelection[rowId] = true;
      }
    });

    setRowSelection(newSelection);
  }, [selectedTrials, table.getRowModel().rows.length, setRowSelection]); // 의존성을 rows.length로 변경

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
          table.getSelectedRowModel().rows.forEach((row) => {
            const rowId = row.id;
            if (rowSelection[rowId]) {
              const trial = table.getRow(rowId).original;
              selectedRows.push(trial);
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
