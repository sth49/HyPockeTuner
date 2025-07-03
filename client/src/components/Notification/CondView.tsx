import { MdNotificationAdd } from "react-icons/md";
import { useExperimentStore } from "../../stores/experimentStore";

import { notiTypeIcons } from "../../utils/icon";
import { useNavigation } from "../../hooks/useNavigation";
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
          notiCondPairs.map((pair, index) => {
            if (pair.status === "satisfied") return null; // Skip satisfied conditions
            const Icon =
              pair.eventCond && pair.eventCond.type
                ? notiTypeIcons[pair.eventCond.type]
                : null; // Use the icon based on the type
            return (
              <li
                key={index}
                className="h-[50px] bg-white flex items-center"
                style={{
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div className="w-[80%] flex gap-4 items-center justify-start px-2">
                  {Icon && <Icon size={24} />}
                  <div className="flex flex-col justify-center items-start flex-1">
                    <p>{pair.eventCond.toString()}</p>
                    <p className="text-xs">{pair.eventCond.toContent()}</p>
                  </div>
                </div>
                <div className="w-[20%] flex items-center justify-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                  />
                  {/* <input
                    type="checkbox"
                    className="toggle toggle-sm border-gray-600 bg-gray-500 checked:border-base-500 checked:bg-base-400 checked:text-base-800"
                  /> */}
                </div>
                {/* <input type="switch" /> */}
              </li>
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
