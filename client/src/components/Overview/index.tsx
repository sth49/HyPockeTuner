import ExpInfo from "./ExpInfo";
import GPUPlot from "./GPUPlot";
import HparamEffect from "./HparamEffect";
import PerformancePlot from "./PerformancePlot";
const Overview = () => {
  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      <ExpInfo />
      <PerformancePlot />
      <HparamEffect />
      <GPUPlot />
    </div>
  );
};
export default Overview;
