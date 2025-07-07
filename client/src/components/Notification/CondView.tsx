import { MdNotificationAdd } from "react-icons/md";
import { useExperimentStore } from "../../stores/experimentStore";

import { notiTypeIcons } from "../../utils/icon";
import { useNavigation } from "../../hooks/useNavigation";
import ApiClient from "../../api/api";
const CondView = () => {
  const notiCondPairs = useExperimentStore((state) => state.notiCondPairs);

  const { handleNavigate } = useNavigation();
  return (
    <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4 gap-4">
      <ul className="list">
        <li
          className="h-[40px] bg-white flex items-center "
          style={{
            borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
          }}
        >
          <div className="w-[80%] flex items-center justify-center uppercase font-semibold">
            Triggerring Conditions
          </div>
          <div className="w-[20%] flex items-center justify-center uppercase font-semibold">
            Active
          </div>
        </li>
        {notiCondPairs.length > 0 ? (
          notiCondPairs.map((noti, index) => {
            if (noti.status === "satisfied") return null; // Skip satisfied conditions
            const Icon =
              noti.eventCond && noti.eventCond.type
                ? notiTypeIcons[noti.eventCond.type]
                : null; // Use the icon based on the type
            return (
              <div key={index}>
                {noti && noti.timeoutCond ? (
                  <li
                    className="h-[100px] bg-white flex items-center"
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="w-[80%] h-full flex flex-col ">
                      <div className="w-full h-[50%] flex gap-4 items-center justify-start px-2 border-b border-gray-200 border-dashed">
                        {noti.eventCond && noti.eventCond.type
                          ? (() => {
                              return Icon ? <Icon size={24} /> : null;
                            })()
                          : null}
                        <div className="flex flex-col justify-center items-start flex-1">
                          <p>{noti.eventCond.toString()}</p>
                          <p className="text-xs">
                            {noti.eventCond.toContent()}
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-[50%] flex gap-4 items-center justify-start px-2">
                        {noti.timeoutCond && noti.timeoutCond.type
                          ? (() => {
                              const Icon = notiTypeIcons[noti.timeoutCond.type];
                              return Icon ? <Icon size={24} /> : null;
                            })()
                          : null}
                        <div className="flex flex-col justify-center items-start flex-1">
                          <p>{noti.timeoutCond.toString()}</p>
                          <p className="text-xs">
                            {noti.timeoutCond.toContent()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="w-[20%] flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={noti.active}
                        onChange={() => {
                          // Handle checkbox change
                          // You can implement the logic to activate/deactivate the condition here
                          // console.log("Checkbox changed for condition:", noti);
                          notiCondPairs[index].active =
                            !notiCondPairs[index].active; // Toggle active state
                          useExperimentStore
                            .getState()
                            .setNotiCondPairs(notiCondPairs);
                          ApiClient.editCondition(notiCondPairs[index]);
                        }}
                        // defaultChecked
                        className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                      />
                    </div>
                  </li>
                ) : noti ? (
                  <li
                    className="h-[50px] bg-white flex items-center"
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="w-[80%] flex gap-4 items-center justify-start px-2">
                      {noti.eventCond && noti.eventCond.type
                        ? (() => {
                            const Icon = notiTypeIcons[noti.eventCond.type];
                            return Icon ? <Icon size={24} /> : null;
                          })()
                        : null}
                      <div className="flex flex-col justify-center items-start flex-1">
                        <p>{noti.eventCond.toString()}</p>
                        <p className="text-xs">{noti.eventCond.toContent()}</p>
                      </div>
                    </div>
                    <div className="w-[20%] flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={noti.active}
                        onChange={() => {
                          // console.log("Checkbox changed for condition:", noti);
                          notiCondPairs[index].active =
                            !notiCondPairs[index].active; // Toggle active state
                          useExperimentStore
                            .getState()
                            .setNotiCondPairs(notiCondPairs);
                          ApiClient.editCondition(notiCondPairs[index]);
                        }}
                        className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                      />
                    </div>
                  </li>
                ) : (
                  <li
                    className="h-[60px] bg-white flex items-center justify-center"
                    style={{
                      borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
                    }}
                  >
                    No conditions set yet.
                  </li>
                )}
              </div>
            );
          })
        ) : (
          <li
            className="h-[60px] bg-white flex items-center justify-center"
            style={{
              borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
            }}
          >
            No conditions set.
          </li>
        )}
      </ul>
      <div className="flex items-center justify-between gap-2">
        <button
          className="btn btn-primary btn-sm text-white w-[49%] flex items-center uppercase"
          onClick={() => handleNavigate("/notification/add/progress")}
        >
          <MdNotificationAdd className="text-xl mb-1" />
          <p className="text-center">Progress</p>
        </button>
        <button
          className="btn btn-primary btn-sm text-white w-[49%] flex items-center uppercase"
          onClick={() => handleNavigate("/notification/add/performance")}
        >
          <MdNotificationAdd className="text-xl mb-1" />

          <p className="text-center">Performance</p>
        </button>
      </div>
    </div>
  );
};
export default CondView;
