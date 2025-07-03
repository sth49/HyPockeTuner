import Legend from "../common/Legend";

import { FaPlus } from "react-icons/fa6";
import { useNavigation } from "../../hooks/useNavigation";
import TrialTable from "../common/TrialTable";
import { useTrialData } from "../../hooks/useTrialData";

const Records = () => {
  const { setExpanded, table } = useTrialData(true, false);
  const { handleNavigate } = useNavigation();

  const handleRowClick = (rowId: string) => {
    setExpanded((prev) => {
      const newExpanded: Record<string, boolean> = {
        ...(typeof prev === "object" && prev !== null ? prev : {}),
      };
      if (newExpanded[rowId]) {
        delete newExpanded[rowId];
      } else {
        Object.keys(newExpanded).forEach((key) => {
          delete newExpanded[key];
        });
        newExpanded[rowId] = true;
      }
      return newExpanded;
    });
  };

  return (
    <div className="w-full h-full ">
      <div className="absolute top-[110px] left-0 w-full h-[50px] bg-white z-999 flex items-center justify-center gap-1 border-b-[0.5px] border-b-[#e0e0e0]">
        <div className="flex items-center flex-col pl-2">
          <Legend type="loss" width={200} />
          <Legend width={200} />
        </div>
        <div className="flex-1 h-full flex items-center justify-center">
          <button
            className="btn btn-xs btn-primary text-xs text-gray-500 text-white"
            onClick={() => {
              handleNavigate("/trial/new");
            }}
          >
            <FaPlus />
          </button>
        </div>
      </div>
      <div className="w-full h-full overflow-auto pt-[45px] pb-0">
        <TrialTable table={table} handleRowClick={handleRowClick} />
      </div>
    </div>
  );
};

export default Records;
