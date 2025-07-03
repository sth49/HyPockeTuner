import CondView from "./CondView";
import PushView from "./PushView";

const Notification = () => {
  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      <PushView />
      <CondView />
    </div>
  );
};
export default Notification;
