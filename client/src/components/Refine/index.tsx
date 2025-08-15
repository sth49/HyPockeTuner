import { useNavigation } from "../../hooks/useNavigation";
import HeaderText from "../common/HeaderText";

import { MdTouchApp } from "react-icons/md";
import { timelineIcons } from "../../utils";

const Refine = () => {
  const { handleNavigate } = useNavigation();
  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col">
      {/* <div className="bg-white">Refine Component</div> */}
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <div className="flex items-center gap-1">
          <timelineIcons.narrowConfigspace size={20} />
          <HeaderText text="Narrow the hyperparameter space by" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            className="btn btn-neutral-content btn-sm text-gray-500 w-[48%] flex h-15 justify-between uppercase"
            onClick={() => {
              handleNavigate("/select/narrow");
            }}
          >
            <MdTouchApp className="text-2xl mb-1" />
            <div className="flex flex-col items-center flex-1 justify-center">
              <p className="text-center">Choosing</p>
              <p>base trials</p>
            </div>
          </button>
          <button
            className="btn btn-neutral-content btn-sm text-gray-500 w-[48%] flex h-15 justify-between uppercase"
            onClick={() => {
              handleNavigate("/refine/narrow/hpspace");
            }}
          >
            <div className="flex flex-col items-center flex-1 justify-center">
              <p className="text-center">Manually</p>
              <p>Configuring</p>
            </div>
          </button>
        </div>
      </div>
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <div className="flex items-center gap-1">
          <timelineIcons.redefineExperiment size={18} />

          <HeaderText text="Redefine the hyperparameter space by" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            className="btn btn-neutral-content btn-sm text-gray-500 w-[48%] flex h-15 justify-between uppercase"
            onClick={() => {
              handleNavigate("/select/redefine");
            }}
          >
            <MdTouchApp className="text-2xl mb-1" />
            <div className="flex flex-col items-center flex-1 justify-center">
              <p className="text-center">Choosing</p>
              <p>base trials</p>
            </div>
          </button>
          <button
            className="btn btn-neutral-content btn-sm text-gray-500 w-[48%] flex h-15 justify-between uppercase"
            onClick={() => handleNavigate(`/experiment/new/1/redefine`)}
          >
            <div className="flex flex-col items-center flex-1 justify-center">
              <p className="text-center">Manually</p>
              <p>Configuring</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Refine;
