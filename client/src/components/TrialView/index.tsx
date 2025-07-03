import { useState } from "react";
import Timeline from "../Timeline";
import Records from "../Records";
import Brackets from "../Brackets";

const TrialView = () => {
  const [viewType, setViewType] = useState<"timeline" | "brackets" | "records">(
    "timeline"
  );
  const viewName = {
    timeline: "Timeline",
    brackets: "Brackets & Rounds",
    records: "Records",
  };

  return (
    <div className="w-full h-full pt-[45px] pb-0 bg-white">
      <div className="join absolute top-[65px] left-0 w-full h-[45px] bg-base-100 z-999 flex items-center justify-center border-b-[0.5px] border-b-[#e0e0e0]">
        {["timeline", "brackets", "records"].map((type) => (
          <button
            key={type}
            className={`w-[33%] join-item btn btn-sm p-0 pr-1 pl-1 ${
              viewType === type ? "btn-primary" : ""
            }`}
            style={{
              color: viewType === type ? "#fff" : "oklch(55.1% 0.027 264.364)",
            }}
            onClick={() => {
              setViewType(type as "timeline" | "brackets" | "records");
            }}
          >
            {viewName[type as "timeline" | "brackets" | "records"]}
          </button>
        ))}
      </div>
      {viewType === "timeline" ? (
        <div className="w-full h-full">
          <Timeline />
        </div>
      ) : viewType === "brackets" ? (
        <Brackets />
      ) : viewType === "records" ? (
        <>
          <Records />
        </>
      ) : null}
    </div>
  );
};

export default TrialView;
