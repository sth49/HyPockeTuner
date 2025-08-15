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
        console.log("🔍 ProgressButton clicked - Debug info:");
        console.log("  - runningExp:", runningExp);
        console.log("  - currExpId:", currExpId);
        console.log("  - status:", status);
        console.log("  - runningExp === null:", runningExp === null);
        console.log("  - runningExp === currExpId:", runningExp === currExpId);
        console.log("  - runningExp !== currExpId:", runningExp !== currExpId);
        console.log("  - Case will be:", 
          runningExp === null || runningExp === "" ? "1 (No experiment running)" :
          runningExp === currExpId && status === "running" ? "2 (Same experiment - pause)" :
          runningExp !== currExpId && runningExp !== null && runningExp !== "" ? "3 (Different experiment - conflict)" :
          "Unknown"
        );

        const showModal = (modalId: string, fallbackMessage?: string, fallbackAction?: () => void) => {
          setTimeout(() => {
            const modal = document.getElementById(modalId) as HTMLDialogElement | null;
            if (modal) {
              console.log(`✅ Showing modal: ${modalId}`);
              modal.showModal();
            } else {
              console.warn(`❌ Modal '${modalId}' not found in DOM`);
              if (fallbackMessage && fallbackAction && confirm(fallbackMessage)) {
                fallbackAction();
              }
            }
          }, 100);
        };

        // Case 1: No experiment is currently running - direct action
        if (runningExp === null || runningExp === "") {
          console.log("📝 Case 1: No experiment running - direct action");
          if (status === "pending" || status === "reserved") {
            console.log("🚀 Starting experiment:", currExpId);
            ApiClient.call(["exp/start/" + currExpId]);
          } else if (status === "paused" || status === "auto_paused") {
            console.log("▶️ Resuming experiment:", currExpId);
            ApiClient.call(["exp/resume/" + currExpId]);
          }
          return;
        }

        // Case 2: The running experiment is the same as current viewing experiment - show pause confirmation
        if (runningExp === currExpId && status === "running") {
          console.log("⏸️ Case 2: Same experiment running - showing pause confirmation");
          showModal(
            "pause_confirm_modal",
            "Are you sure you want to pause this experiment?",
            () => ApiClient.call(["exp/pause/" + currExpId])
          );
          return;
        }

        // Case 3: Another experiment is running - show conflict resolution modal
        if (runningExp !== currExpId && runningExp !== null && runningExp !== "") {
          console.log("⚠️ Case 3: Different experiment running - showing conflict modal");
          console.log("  - Will show conflict_action_modal");
          
          showModal(
            "conflict_action_modal",
            "Another experiment is running. Do you want to pause it and start/resume this experiment?",
            () => {
              console.log("✅ User confirmed conflict resolution");
              if (status === "pending" || status === "reserved") {
                console.log("🚀 Starting new experiment:", currExpId);
                ApiClient.call(["exp/start/" + currExpId]);
              } else if (status === "paused" || status === "auto_paused") {
                console.log("▶️ Resuming experiment:", currExpId);
                ApiClient.call(["exp/resume/" + currExpId]);
              }
            }
          );
          return;
        }

        console.log("🤷 No matching case found - this should not happen");
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
