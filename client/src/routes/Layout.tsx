import {
  IoCloseSharp,
  IoChevronBack,
  IoChevronBackOutline,
} from "react-icons/io5";
import { FaUser } from "react-icons/fa6";
import { navIcons } from "../utils/icon";
// import Progress from "../components/Progress";
import { hpTypeIcons } from "../utils/icon";
import ExpSummaryView from "../components/workspace/ExpSummaryView";
import { useMetadataStore } from "../stores/metadataStore";
import { useExperimentStore } from "../stores/experimentStore";
import { useAuthStore } from "../stores/authStore";
import { useNavigation } from "../hooks/useNavigation";
import ApiClient from "../api/api";
import ProgressButton from "../components/common/ProgressButton";
import ExperimentActionModal from "../components/common/ExperimentActionModal";
import { useParams } from "react-router";

interface LayoutProps {
  children: React.ReactNode;
  viewType?: string;
  isNav?: boolean;
}

const titles = {
  workspace: "Workspace",
  setting: "Setting",
  experiment1: "New Experiment",
  experiment2: "New Experiment",
  hyperparameterSpace: "Hyperparameter Space",
  trialSelection: "Trial Selection",
  refine: "Refine",
  notification: "Notification",
  userTrial: "User Trial",
  notiCond: "Condition",
  overview: "Overview",
};

const Layout: React.FC<LayoutProps> = ({ children, viewType, isNav }) => {
  const { handleNavigate } = useNavigation();
  const { currentUser } = useAuthStore();

  const headerHeight = 65;
  const mainMarginTop = headerHeight;
  const names = {
    constant: "Fixed",
    unordered: "Nominal",
    ordinal: "Ordinal",
    uniform: "Continuous",
  };
  const expList = useMetadataStore((state) => state.expList);
  const currExpId = useExperimentStore((state) => state.expId);

  const currExp = expList.find((exp) => exp.id === currExpId);

  const status = useExperimentStore((state) => state.status);
  const runningExp = useExperimentStore((state) => state.runningExp);

  const type = useParams<{ type: string }>().type;
  const notiCondType = useParams<{ notiCondType: string }>().notiCondType;
  const setSelectedTrials = useExperimentStore(
    (state) => state.setSelectedTrials
  );

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden text-gray-500">
      <header
        className="fixed top-0 left-0 w-full border-b-[0.5px] border-b-[#e0e0e0] flex items-center justify-center bg-base-100"
        style={{ height: `${headerHeight}px`, zIndex: 1000 }}
      >
        {!isNav ? (
          <div className="flex items-center justify-center flex-col">
            <p className="text-[0.5rem]">HyPockeTuner</p>
            <p className="text-lg font-semibold uppercase">
              {viewType === "notiCond"
                ? notiCondType + " " + titles[viewType as keyof typeof titles]
                : titles[viewType as keyof typeof titles]}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <button
              onClick={() => {
                handleNavigate("/workspace");
                if (currentUser) {
                  ApiClient.postVisibility(currentUser, false).catch(
                    (error) => {
                      console.error("Failed to send visibility data:", error);
                    }
                  );
                }
                console.log("Navigating to workspace");
              }}
              className="transition-colors ml-2"
            >
              <IoChevronBack size={20} />
            </button>
            {currExp && (
              <div className="flex-1 h-full">
                <ExpSummaryView exp={currExp} />
              </div>
            )}

            {currExpId && status !== null && status !== "finished" && (
              <div className="flex items-center mr-2">
                <ProgressButton />

                {/* Pause Confirmation Modal */}
                <ExperimentActionModal
                  modalId="pause_confirm_modal"
                  title="Pause Experiment"
                  message={`Are you sure you want to pause the experiment "${currExp?.name}"? This will stop the current training process and you can resume it later.`}
                  confirmText="Pause Experiment"
                  onConfirm={() => ApiClient.call(["exp/pause/" + currExpId])}
                  actionType="pause"
                />

                {/* Start/Resume with Running Experiment Modal */}
                <ExperimentActionModal
                  modalId="conflict_action_modal"
                  title="Another Experiment Running"
                  message={`Experiment "${runningExp?.slice(
                    0,
                    8
                  )}..." is currently running. ${
                    status === "paused" || status === "auto_paused"
                      ? "Resuming"
                      : "Starting"
                  } this experiment will automatically pause the running one. Do you want to continue?`}
                  confirmText={
                    status === "paused" || status === "auto_paused"
                      ? "Resume This Experiment"
                      : "Start This Experiment"
                  }
                  onConfirm={() => {
                    if (status === "pending" || status === "reserved") {
                      ApiClient.call(["exp/start/" + currExpId]);
                    } else if (
                      status === "paused" ||
                      status === "auto_paused"
                    ) {
                      ApiClient.call(["exp/resume/" + currExpId]);
                    }
                  }}
                  actionType={
                    status === "paused" || status === "auto_paused"
                      ? "resume"
                      : "start"
                  }
                />
              </div>
            )}
          </div>
          // </div>
        )}

        {viewType === "notiCond" && (
          <div className="absolute right-0 flex items-center justify-center mr-4">
            <button
              onClick={() => {
                handleNavigate("/main/notification");
              }}
              className="transition-colors"
            >
              <IoCloseSharp size={20} />
            </button>
          </div>
        )}

        {(viewType === "experiment2" ||
          (viewType === "experiment1" && type === "redefine")) && (
          <>
            <div className="absolute top-0 left-0 h-[65px] flex items-center justify-center ml-4">
              <button
                onClick={() => {
                  if (viewType === "experiment1") {
                    handleNavigate(`/select/redefine`);
                  } else {
                    handleNavigate(`/experiment/new/1/${type}`);
                  }
                }}
              >
                <IoChevronBackOutline size={20} />
              </button>
            </div>
            {viewType === "experiment2" && (
              <div className="absolute top-[55px] w-full left-0 h-[35px] border-b-[0.5px] border-b-[#e0e0e0] flex items-center justify-between bg-base-100 pr-4 pl-4">
                {(Object.keys(names) as Array<keyof typeof names>).map(
                  (key) => {
                    const Icon = hpTypeIcons[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-center gap-1 text-sm"
                      >
                        <Icon size={15} />
                        <p className="text-xs">{names[key]}</p>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}

        {(viewType === "hyperparameterSpace" ||
          viewType === "trialSelection") && (
          <>
            {viewType === "hyperparameterSpace" && (
              <div className="absolute top-0 left-0 h-[65px] flex items-center justify-center ml-4">
                <button onClick={() => handleNavigate("/select/narrow")}>
                  <IoChevronBackOutline size={20} />
                </button>
              </div>
            )}
            <div className="absolute right-0 flex items-center justify-center mr-4 ">
              <button
                onClick={() => {
                  setSelectedTrials([]);
                  handleNavigate("/main/refine");
                }}
              >
                <IoCloseSharp size={20} />
              </button>
            </div>
          </>
        )}

        {viewType === "workspace" && (
          <div className="absolute right-0 flex items-center gap-3 mr-4">
            {/* <div className="text-xs text-gray-600">{currentUser}</div> */}
            <button onClick={() => handleNavigate("/setting")}>
              <FaUser />
            </button>
          </div>
        )}

        {(viewType === "setting" ||
          viewType === "experiment1" ||
          viewType === "experiment2") && (
          <div className="absolute right-0 flex items-center justify-center mr-4">
            <button
              onClick={() => {
                if (type === "redefine") {
                  setSelectedTrials([]);
                  handleNavigate("/main/refine");
                } else {
                  handleNavigate("/workspace");
                }
              }}
            >
              <IoCloseSharp size={20} />
            </button>
          </div>
        )}
        {viewType === "userTrial" && (
          <div className="absolute right-0 flex items-center justify-center mr-4">
            <button onClick={() => handleNavigate("/main/trials")}>
              <IoCloseSharp size={20} />
            </button>
          </div>
        )}
      </header>

      <main
        className="w-full flex-grow overflow-auto bg-base-100"
        style={{
          marginTop: `${mainMarginTop}px`,
          // marginBottom: isNav ? `${headerHeight}px` : 0,
          marginBottom: viewType === "setting" ? 0 : headerHeight,
        }}
      >
        {children}
      </main>

      {isNav && (
        <div
          className="fixed left-0 bottom-0 flex flex-col items-start w-full bg-white border-t-[0.5px] border-t-[#e0e0e0]"
          style={{ height: `${headerHeight}px`, zIndex: 1000 }}
        >
          <div className="flex h-full items-center justify-around w-full">
            {["overview", "trials", "refine", "notification"].map(
              (item, index) => {
                const IconComponent = navIcons[item as keyof typeof navIcons];
                return (
                  <div
                    key={index}
                    className={`w-[25%] flex h-full flex-col justify-center items-center ${
                      viewType === item
                        ? "text-primary font-bold"
                        : "text-gray-500"
                    }`}
                    onClick={() => handleNavigate(`/main/${item}`)}
                  >
                    {IconComponent && <IconComponent size={25} />}
                    <p className="text-xs">
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </p>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
