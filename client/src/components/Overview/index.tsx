import HeaderText from "../common/HeaderText";
import ExpInfo from "./ExpInfo";
import GPUPlot from "./GPUPlot";
import HparamEffect from "./HparamEffect";
const Overview = () => {
  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      <ExpInfo />
      {/* <GPUPlot /> */}
      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="GPU Monitoring" />
        <GPUPlot />
      </div>
      <HparamEffect />
    </div>
  );
};
export default Overview;
