import { MdNotificationAdd } from "react-icons/md";
import { useExperimentStore } from "../../stores/experimentStore";
import { useState, useRef } from "react";
import { notiTypeIcons } from "../../utils/icon";
import { useNavigation } from "../../hooks/useNavigation";
import ApiClient from "../../api/api";
import { getBorderColor, NotiType } from "../../models/notification";
const CondView = () => {
  const notiCondPairs = useExperimentStore((state) => state.notiCondPairs);

  const setNotiCondPairs = useExperimentStore(
    (state) => state.setNotiCondPairs
  );
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const pendingToggleIndex = useRef<number | null>(null);

  const handleToggleClick = (index: number) => {
    // Store the pending index and show confirmation dialog
    pendingToggleIndex.current = index;
    setShowConfirmDialog(true);
  };

  const handleConfirmToggle = () => {
    if (pendingToggleIndex.current === null) return;
    
    const index = pendingToggleIndex.current;
    // 원본 객체의 active 속성 토글
    const targetPair = notiCondPairs[index];
    targetPair.active = !targetPair.active;
    
    // 새로운 배열 생성하여 React 상태 업데이트 트리거
    const updatedPairs = [...notiCondPairs];
    setNotiCondPairs(updatedPairs);
    
    // 원본 객체는 toJSON 메서드를 가지고 있으므로 API 호출 가능
    ApiClient.editCondition(targetPair);
    
    // Close dialog and clear pending index
    setShowConfirmDialog(false);
    pendingToggleIndex.current = null;
  };

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
            Notification Conditions
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
                              return (
                                <div
                                  className={`rounded-[3px] w-[30px] h-[30px] border-[1px] flex justify-center items-center ${getBorderColor(
                                    noti.eventCond.type ?? NotiType.TIMEOUT
                                  )}`}
                                >
                                  {Icon && <Icon size={24} />}
                                </div>
                              );
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
                              return Icon ? (
                                <div
                                  className={`rounded-[3px] w-[30px] h-[30px] border-[1px] flex justify-center items-center ${getBorderColor(
                                    noti.timeoutCond.type ?? NotiType.TIMEOUT
                                  )}`}
                                >
                                  <Icon size={24} />
                                </div>
                              ) : null;
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
                        // onChange={() => {
                        //   // Handle checkbox change
                        //   // You can implement the logic to activate/deactivate the condition here
                        //   // console.log("Checkbox changed for condition:", noti);
                        //   notiCondPairs[index].active =
                        //     !notiCondPairs[index].active; // Toggle active state
                        //   useExperimentStore
                        //     .getState()
                        //     .setNotiCondPairs(notiCondPairs);
                        //   ApiClient.editCondition(notiCondPairs[index]);
                        // }}
                        onChange={() => handleToggleClick(index)}
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
                            return (
                              <div
                                className={`rounded-[3px] w-[30px] h-[30px] border-[1px] flex justify-center items-center ${getBorderColor(
                                  noti.eventCond.type ?? NotiType.TIMEOUT
                                )}`}
                              >
                                {Icon && <Icon size={24} />}
                              </div>
                            );
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
                        // onChange={() => {
                        //   // console.log("Checkbox changed for condition:", noti);
                        //   notiCondPairs[index].active =
                        //     !notiCondPairs[index].active; // Toggle active state
                        //   useExperimentStore
                        //     .getState()
                        //     .setNotiCondPairs(notiCondPairs);
                        //   ApiClient.editCondition(notiCondPairs[index]);
                        // }}
                        onChange={() => handleToggleClick(index)}
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
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <>
          {/* Background overlay with opacity */}
          <div
            className="fixed inset-0 bg-black opacity-30 z-40"
            onClick={() => {
              setShowConfirmDialog(false);
              pendingToggleIndex.current = null;
            }}
          />
          
          {/* Dialog container */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                Change notification status?
              </h3>
              <p className="text-gray-600 mb-6">
                {pendingToggleIndex.current !== null && notiCondPairs[pendingToggleIndex.current] ? (
                  <>
                    Do you want to {notiCondPairs[pendingToggleIndex.current].active ? 'deactivate' : 'activate'} this notification condition?
                  </>
                ) : (
                  'Do you want to change this notification condition?'
                )}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    pendingToggleIndex.current = null;
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmToggle}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default CondView;
