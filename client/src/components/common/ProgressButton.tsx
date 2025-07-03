import { FaPause, FaPlay } from "react-icons/fa6";
import ApiClient from "../../api/api";
import { useExperimentStore } from "../../stores/experimentStore";
// import ApiClient from "../api/api";

type ProgressButtonProps = {
  isGhost?: boolean;
};

const ProgressButton = ({ isGhost = false }: ProgressButtonProps) => {
  const runningExp = useExperimentStore((state) => state.runningExp);

  const currExpId = useExperimentStore((state) => state.expId);

  const status = useExperimentStore((state) => state.status);
  return (
    <button
      className={`btn btn-primary flex items-center p-0  w-[30px] h-[30px] justify-center ${
        isGhost ? "btn-ghost" : "btn-primary text-white hover:bg-primary-focus"
      }`}
      onClick={() => {
        if (runningExp === null) {
          if (status === "pending") {
            ApiClient.call(["exp/start/" + currExpId]);
          } else if (status === "paused" || status === "auto_paused") {
            ApiClient.call(["exp/resume/" + currExpId]);
          } else if (status === "reserved") {
            ApiClient.call(["exp/start/" + currExpId]);
          }
        }
        if (runningExp === currExpId) {
          // 돌아가고 있는 실험이 현재 보고있는 실험과 같을 때
          if (status === "running") {
            ApiClient.call(["exp/pause/" + currExpId]);
          }
        }
        if (runningExp !== currExpId) {
          console.log("runningExp", runningExp);
          console.log("currExpId", currExpId);
          const modal = document.getElementById(
            "check_modal"
          ) as HTMLDialogElement | null;
          if (modal) {
            modal.showModal();
          }
        }
      }}
    >
      {status === "pending" ||
      status === "auto_paused" ||
      status === "reserved" ||
      status === "paused" ? (
        <FaPlay size={20} />
      ) : status === "running" ? (
        <FaPause size={20} />
      ) : null}
    </button>
  );
};
export default ProgressButton;
