import { formatting } from "../../utils/formatting";
import { useColorScale } from "../../utils/colorScale";
import { NodeProps, NodeType, Sizes } from "./types";
import { FaUser } from "react-icons/fa";
import { TrialState } from "../../types/experiment";
import { BAND_COLORS } from "../../constants/timelineLayout";

const getNodeStyles = (
  viewType: string,
  nodeWidth: number,
  nodeHeight: number
) => ({
  container: {
    width: `${nodeWidth}px`,
    height: `${nodeHeight}px`,
    flexDirection: viewType === "horizontal" ? "row" : "column",
    borderRadius: viewType === "circle" ? "50%" : "5px",
  },
  topSection: {
    width:
      viewType === "horizontal"
        ? "30%"
        : viewType === "circle"
        ? "100%"
        : `${nodeWidth}px`,
    height:
      viewType === "horizontal"
        ? "100%"
        : viewType === "circle"
        ? "50%"
        : "40%",
  },
  bottomSection: {
    width:
      viewType === "horizontal"
        ? "70%"
        : viewType === "circle"
        ? "100%"
        : `${nodeWidth - 2}px`,
    height:
      viewType === "horizontal"
        ? `${nodeHeight - 2}px`
        : viewType === "circle"
        ? "50%"
        : "70%",
    borderRadius:
      viewType === "circle"
        ? `0px 0px ${nodeWidth / 2}px ${nodeWidth / 2}px` // 완전한 반원을 위해 nodeWidth/2 사용
        : viewType === "horizontal"
        ? "0px 4px 4px 0px"
        : "0px 0px 4px 4px",
  },
});

const getContainerClassName = (viewType: string) => {
  const baseClasses =
    "flex items-center justify-center border-[1px] border-gray-300 relative z-10 text-gray-500";

  if (viewType === "circle") {
    return baseClasses; // borderRadius는 인라인 스타일로 처리
  }
  return `${baseClasses} rounded-[5px]`; // 기본은 Tailwind 클래스 사용
};

const IDIndicator: React.FC<{
  id: string;
  trial: number;
  viewType: string;
}> = ({ id, trial, viewType }) => {
  if (trial === -1) {
    return viewType === "horizontal" ? (
      <FaUser size={10} />
    ) : (
      <p className={"text-[0.6rem]"}>User</p>
    );
  }

  return <p className={"text-[0.6rem]"}>{id}</p>;
};

const NumOfTrials: React.FC<{
  metric: number;
  getFontColor: (value: number) => string;
  numOfTrials: number;
}> = ({ metric, getFontColor, numOfTrials }) => {
  return (
    <div
      className="flex items-end justify-center italic"
      style={{
        color: metric != null ? getFontColor(metric) : "",
      }}
    >
      <p className="text-xs">{numOfTrials != null ? `${numOfTrials}` : ""}</p>
      <p className="text-[0.5rem] ml-1 mb-0.4">
        {numOfTrials > 1 ? "trials" : numOfTrials === 1 ? "trial" : ""}
      </p>
    </div>
  );
};

// 메트릭 값 컴포넌트
const MetricValue: React.FC<{
  metric?: number;
  visibleIsBest?: boolean;
  isBest?: boolean;
  getFontColor: (value: number) => string;
}> = ({ metric, visibleIsBest = false, isBest = false, getFontColor }) => {
  const displayValue =
    visibleIsBest && !isBest
      ? ""
      : metric != null
      ? formatting(Number(metric), "float")
      : "";

  return (
    <p
      className="text-xs"
      style={{
        color: metric != null ? getFontColor(metric) : "",
      }}
    >
      {displayValue}
    </p>
  );
};

// First/Last 라운드가 보이는 Trial 노드 컴포넌트
const FirstLastTrialNode: React.FC<{
  data: TrialState;
  type: NodeType;
  styles: any;
  viewType: string;
  visibleIsBest?: boolean;
  getMetricColor: (value: number) => string;
  getFontColor: (value: number) => string;
}> = ({
  data,
  type,
  styles,
  viewType,
  visibleIsBest,
  getMetricColor,
  getFontColor,
}) => {
  const isSpecialRound = data.isFirstRound || data.isLastRound;

  return (
    <div
      className={`${getContainerClassName(viewType)} bg-white`}
      style={{
        ...styles.container,
        backgroundColor: isSpecialRound
          ? "white"
          : type === "trial" && data.metric != null
          ? getMetricColor(data.metric)
          : "gray",
      }}
    >
      {isSpecialRound ? (
        <>
          <div
            className="flex items-center justify-center w-full"
            style={styles.topSection}
          >
            <IDIndicator
              id={`R${data.roundId}-${data.trialId ?? 0}`}
              trial={data.trialId ?? 0}
              viewType={viewType}
            />
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              ...styles.bottomSection,
              backgroundColor:
                type === "trial" && data.metric != null
                  ? getMetricColor(data.metric)
                  : "white",
            }}
          >
            <MetricValue
              metric={data.metric}
              visibleIsBest={visibleIsBest}
              isBest={data.isBest}
              getFontColor={getFontColor}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <MetricValue
            metric={data.metric}
            visibleIsBest={visibleIsBest}
            isBest={data.isBest}
            getFontColor={getFontColor}
          />
        </div>
      )}
    </div>
  );
};

interface MergedNodeProps {
  bandBracketId?: number;
  data: TrialState[];
  styles: any;
  direction: any;
  overlap?: number;
  getMetricColor: (value: number) => string;
  getFontColor: (value: number) => string;
  viewType: string;
  mergeType?: string;
}

const MergedNode: React.FC<MergedNodeProps> = ({
  bandBracketId,
  data,
  styles,
  direction = "rtl-start",
  overlap = 4,
  getMetricColor,
  getFontColor,
  viewType,
  mergeType = "individual",
}) => {
  const getOffset = (index: number) => {
    const offset = index * overlap;

    switch (direction) {
      case "ltr-start":
      case "ltr-end":
      case "ltr-middle":
        return {
          transform: `translate(${-offset}px, ${offset}px)`,
          zIndex: data.length - index,
        };
      case "rtl-start":
      case "rtl-end":
      case "rtl-middle":
      default:
        return {
          transform: `translate(${offset}px, ${offset}px)`,
          zIndex: data.length - index,
        };
    }
  };
  const woUser = data.filter(
    (item) => item.trialId !== -1 && item.trialId !== undefined
  );
  const allMetrics = data
    .map((item) => item.metric)
    .filter((metric) => metric != null);
  const minMetric = Math.min(...allMetrics);
  const medianMetric =
    allMetrics.length > 0
      ? allMetrics.sort((a, b) => a - b)[Math.floor(allMetrics.length / 2)]
      : 0;
  const maxMetric = Math.max(...allMetrics);
  const metricForColor = [maxMetric, medianMetric, minMetric];

  const nodeId =
    bandBracketId === -2
      ? "Queued"
      : mergeType === "bracket"
      ? `R${woUser[0].roundId}:R${woUser[woUser.length - 1].roundId ?? 0}`
      : mergeType === "all"
      ? "Finished"
      : `R${data[0].roundId}-${data[0].trialId ?? 0}:${
          data[data.length - 1].trialId ?? 0
        }`;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        opacity: mergeType === "individual" ? 0.3 : 1,
      }}
    >
      {data.slice(0, 3).map((item, index) => (
        <div
          key={item.id || index}
          className={`absolute flex items-center justify-center border-[1px] border-gray-300 text-gray-500 bg-white ${
            viewType === "circle" ? "" : "rounded-[5px]"
          }`}
          style={{
            ...styles.container,
            ...getOffset(index),
            backgroundColor:
              index === 0
                ? "white"
                : data.length > 3 && allMetrics.length > 3
                ? getMetricColor(metricForColor[index])
                : item.metric != null
                ? getMetricColor(item.metric)
                : "white",
          }}
        >
          {index === 0 && (
            <>
              <div
                className="flex items-center justify-center w-full"
                style={styles.topSection}
              >
                <IDIndicator id={nodeId} trial={0} viewType={viewType} />
              </div>
              <div
                className="flex items-center justify-center"
                style={{
                  ...styles.bottomSection,
                  backgroundColor:
                    data.length > 3 && allMetrics.length > 0
                      ? getMetricColor(metricForColor[index])
                      : item.metric != null
                      ? getMetricColor(item.metric)
                      : "gray",
                }}
              >
                <NumOfTrials
                  metric={
                    data.length > 3 && allMetrics.length > 0
                      ? metricForColor[index] ?? 0
                      : item.metric ?? 0
                  }
                  getFontColor={getFontColor}
                  numOfTrials={data.length}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const CurrentTrialNode: React.FC<{
  data: TrialState;
  styles: any;
  viewType: string;
  visibleIsBest?: boolean;
  getMetricColor: (value: number) => string;
  getFontColor: (value: number) => string;
}> = ({ data, styles, viewType }) => {
  // progress 비율 계산 (0-100%)
  const progressPercentage = data.budget
    ? Math.min(((data.progress ?? 0) / data.budget) * 100, 100)
    : 0;

  // 배경색 결정
  const baseColor = "oklch(87.2% 0.01 258.338)";

  // linear gradient로 progress 표현
  const progressBackground = `linear-gradient(to right, ${baseColor} ${progressPercentage}%, transparent ${progressPercentage}%)`;

  return (
    <div
      className={`flex flex-col items-center justify-center relative z-10 bg-white text-gray-500 ${
        viewType === "circle" ? "" : "rounded-[5px]"
      }`}
      style={styles.container}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-999"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 10 2 
              L 90 2 
              Q 98 2 98 10 
              L 98 90 
              Q 98 98 90 98 
              L 10 98 
              Q 2 98 2 90 
              L 2 10 
              Q 2 2 10 2 Z"
          fill="none"
          stroke="oklch(76.827% 0.074 131.063)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="60 330"
          strokeDashoffset="0"
          opacity="0.9"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-390"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </svg>

      {/* 실제 콘텐츠 */}
      <div className="relative z-10 w-full h-full flex flex-col border border-gray-300 rounded-[5px] bg-white">
        <div
          className="flex items-center justify-center w-full border-b-[0.5px] border-gray-300 gap-1 relative"
          style={styles.topSection}
        >
          {/* <span className="absolute top-0.5 left-0.5 loading loading-spinner text-success loading-xs w-[8px]"></span> */}

          <IDIndicator
            id={`R${data.roundId}-${data.trialId ?? 0}`}
            trial={data.trialId ?? 0}
            viewType={viewType}
          />
        </div>
        <div
          className="flex items-center justify-center text-xs relative gap-1"
          style={{
            ...styles.bottomSection,
            background: progressBackground,
            backgroundColor:
              progressPercentage === 0 ? baseColor : "transparent",
          }}
        >
          {data.progress != null &&
          data.budget &&
          data.progress > data.budget ? (
            <p className="text-xs relative z-10">Testing</p>
          ) : (
            <p className="text-xs relative z-10">
              {data.progress != null
                ? `${data.progress} / ${data.budget}`
                : "In Progress"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// const CurrentTrialNode: React.FC<{
//   data: TrialState;
//   styles: any;
//   viewType: string;
//   visibleIsBest?: boolean;
//   getMetricColor: (value: number) => string;
//   getFontColor: (value: number) => string;
// }> = ({ data, styles, viewType }) => {
//   // progress 비율 계산 (0-100%)
//   const progressPercentage = data.budget
//     ? Math.min(((data.progress ?? 0) / data.budget) * 100, 100)
//     : 0;

//   // 배경색 결정
//   const baseColor = "oklch(87.2% 0.01 258.338)";

//   // linear gradient로 progress 표현
//   const progressBackground = `linear-gradient(to right, ${baseColor} ${progressPercentage}%, transparent ${progressPercentage}%)`;

//   return (
//     <div
//       className={`flex flex-col items-center justify-center border-[1px] border-gray-300 relative z-10 bg-white text-gray-500 ${
//         viewType === "circle" ? "" : "rounded-[5px]"
//       }`}
//       style={styles.container}
//     >
//       <div
//         className="flex items-center justify-center w-full border-b-[0.5px] border-gray-300 gap-1 relative"
//         style={styles.topSection}
//       >
//         <span
//           className="
//         absolute top-0.5 left-0.5
//         loading loading-spinner text-success loading-xs w-[8px]"
//         ></span>

//         <IDIndicator
//           id={`R${data.roundId}-${data.trialId ?? 0}`}
//           trial={data.trialId ?? 0}
//           viewType={viewType}
//         />
//       </div>
//       <div
//         className="flex items-center justify-center text-xs relative gap-1"
//         style={{
//           ...styles.bottomSection,
//           background: progressBackground,
//           backgroundColor: progressPercentage === 0 ? baseColor : "transparent",
//         }}
//       >
//         {data.progress != null && data.budget && data.progress > data.budget ? (
//           <p className="text-xs relative z-10">Testing</p>
//         ) : (
//           <p className="text-xs relative z-10">
//             {data.progress != null
//               ? `${data.progress} / ${data.budget}`
//               : "In Progress"}
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };

const PausedTrialNode: React.FC<{
  data: TrialState;
  styles: any;
  viewType: string;
  visibleIsBest?: boolean;
  getMetricColor: (value: number) => string;
  getFontColor: (value: number) => string;
}> = ({ data, styles, viewType }) => {
  // progress 비율 계산 (0-100%)
  // const progressPercentage = data.budget
  //   ? Math.min(((data.progress ?? 0) / data.budget) * 100, 100)
  //   : 0;

  // // 배경색 결정
  // const baseColor =
  //   data.metric != null
  //     ? getMetricColor(data.metric)
  //     : "oklch(87.2% 0.01 258.338)";

  // linear gradient로 progress 표현
  // const progressBackground = `linear-gradient(to right, ${baseColor} ${progressPercentage}%, transparent ${progressPercentage}%)`;

  return (
    <div
      className={`flex flex-col items-center justify-center border-[1px] border-gray-300 
        border-dashed
        relative z-10 bg-white text-gray-500 ${
          viewType === "circle" ? "" : "rounded-[5px]"
        }`}
      style={styles.container}
    >
      <div
        className="flex items-center justify-center w-full border-b-[0.5px] border-gray-300 border-dashed"
        style={styles.topSection}
      >
        <IDIndicator
          id={`R${data.roundId}-${data.trialId ?? 0}`}
          trial={data.trialId ?? 0}
          viewType={viewType}
        />
      </div>
      <div
        className="flex items-center justify-center text-xs relative"
        style={{
          ...styles.bottomSection,
          // background: progressBackground,

          backgroundColor: "oklch(87.2% 0.01 258.338)", // baseColor,
        }}
      >
        <p className="text-xs relative z-10">Paused</p>
      </div>
    </div>
  );
};

// const CurrentTrialNode: React.FC<{
//   data: TrialState;
//   styles: any;
//   viewType: string;
//   visibleIsBest?: boolean;
//   getMetricColor: (value: number) => string;
//   getFontColor: (value: number) => string;
// }> = ({
//   data,
//   styles,
//   viewType,
//   visibleIsBest,
//   getMetricColor,
//   getFontColor,
// }) => (
//   <div
//     className={`flex flex-col items-center justify-center border-[1px] border-gray-300 relative z-10 bg-white text-gray-500 ${
//       viewType === "circle" ? "" : "rounded-[5px]"
//     }`}
//     style={styles.container}
//   >
//     <div
//       className="flex items-center justify-center w-full"
//       style={styles.topSection}
//     >
//       <IDIndicator
//         id={`R${data.roundId}-${data.trialId ?? 0}`}
//         trial={data.trialId ?? 0}
//         viewType={viewType}
//       />
//     </div>
//     <div
//       className="flex items-center justify-center text-xs"
//       style={{
//         ...styles.bottomSection,
//         backgroundColor:
//           data.metric != null
//             ? getMetricColor(data.metric)
//             : "oklch(87.2% 0.01 258.338)",
//       }}
//     >
//       {data.progress != null && data.budget && data.progress > data.budget ? (
//         <p className="text-xs">Testing</p>
//       ) : (
//         <p className="text-xs">
//           {data.progress != null
//             ? `${data.progress}/${data.budget}`
//             : "In Progress"}
//         </p>
//       )}
//     </div>
//   </div>
// );

// 기본 Trial 노드 컴포넌트
const DefaultTrialNode: React.FC<{
  data: TrialState;
  styles: any;
  viewType: string;
  visibleIsBest?: boolean;
  getMetricColor: (value: number) => string;
  getFontColor: (value: number) => string;
}> = ({
  data,
  styles,
  viewType,
  visibleIsBest,
  getMetricColor,
  getFontColor,
}) => (
  <div
    className={`flex flex-col items-center justify-center border-[1px] border-gray-300 relative z-10 bg-white text-gray-500 ${
      viewType === "circle" ? "" : "rounded-[5px]"
    }`}
    style={styles.container}
  >
    <div
      className="flex items-center justify-center w-full"
      style={styles.topSection}
    >
      <IDIndicator
        id={`R${data.roundId}-${data.trialId ?? 0}`}
        trial={data.trialId ?? 0}
        viewType={viewType}
      />
    </div>
    <div
      className="flex items-center justify-center"
      style={{
        ...styles.bottomSection,
        backgroundColor:
          data.metric != null
            ? getMetricColor(data.metric)
            : "oklch(87.2% 0.01 258.338)",
      }}
    >
      {visibleIsBest && (
        <MetricValue
          metric={data.metric}
          visibleIsBest={visibleIsBest}
          isBest={data.isBest}
          getFontColor={getFontColor}
        />
      )}
    </div>
  </div>
);

// pseudo 노드 컴포넌트
const PseudoNode: React.FC<{
  data: TrialState;
  styles: any;
  bracketId: number;
  direction?: string;
}> = ({ data, styles, bracketId }) => (
  <div
    className={`flex items-center justify-center border-[2px] border-gray-300 text-gray-500 z-10`}
    style={{
      ...styles.container,
      borderRadius: "100%",
      width: "50px",
      height: "40px",
      backgroundColor:
        BAND_COLORS.BAND[(bracketId ?? 0) % BAND_COLORS.BAND.length],
      zIndex: 899,
    }}
  >
    <p>B{data.bracketId}</p>
  </div>
);

const StartNode: React.FC<{
  data: TrialState;
  styles: any;
  bracketId: number;
  direction?: string;
}> = ({ data, styles, bracketId }) => (
  <div className="w-full h-full flex items-center justify-end relative ">
    <div
      className={`flex items-center justify-center border-[1px] border-gray-300 bg-gray-300 absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-10`}
      style={{
        width: "10px",
        height: "10px",
        zIndex: 899,
      }}
    ></div>
    <div
      className={`flex items-center justify-center border-[1px] border-gray-300 text-gray-500 z-10`}
      style={{
        width: "50%",
        height: "0px",
        backgroundColor:
          BAND_COLORS.BAND[(bracketId ?? 0) % BAND_COLORS.BAND.length],
        zIndex: 899,
      }}
    ></div>
  </div>
);

// 메인 Node 컴포넌트
export const Node: React.FC<
  NodeProps & {
    bandBracketId?: number;
    sizes: Sizes;
    viewType?: "rect" | "horizontal" | "circle";
    mergeType?: "individual" | "bracket" | "round" | "all";
    visibleFirstLast?: boolean;
    visibleIsBest?: boolean;
    direction: any;
  }
> = (props) => {
  const {
    bandBracketId,
    type,
    trials,
    sizes,
    viewType = "rect",
    mergeType = "individual",
    visibleFirstLast = false,
    visibleIsBest = true,
    direction = "ltr-start",
  } = props;

  const { getMetricColor, getFontColor } = useColorScale();
  const { nodeWidth, nodeHeight } = sizes;
  const styles = getNodeStyles(viewType, nodeWidth, nodeHeight);

  // 노드 타입에 따른 렌더링
  if (type === "pseudo") {
    return (
      <PseudoNode
        data={trials[0]}
        styles={styles}
        bracketId={trials[0].bracketId ?? 0}
        direction={direction}
      />
    );
  } else if (type === "start") {
    return (
      <StartNode
        data={trials[0]}
        styles={styles}
        bracketId={bandBracketId ?? 0}
        direction={direction}
      />
    );
  } else if (type === "merged") {
    return (
      <MergedNode
        bandBracketId={bandBracketId}
        data={trials}
        styles={styles}
        direction={direction}
        getMetricColor={getMetricColor}
        getFontColor={getFontColor}
        viewType={viewType}
        mergeType={mergeType}
      />
    );
  } else if (type === "paused") {
    return (
      <PausedTrialNode
        data={trials[0]}
        styles={styles}
        viewType={viewType}
        visibleIsBest={visibleIsBest}
        getMetricColor={getMetricColor}
        getFontColor={getFontColor}
      />
    );
  } else if (type === "current") {
    return (
      <CurrentTrialNode
        data={trials[0]}
        styles={styles}
        viewType={viewType}
        visibleIsBest={visibleIsBest}
        getMetricColor={getMetricColor}
        getFontColor={getFontColor}
      />
    );
  }

  if (visibleFirstLast) {
    return (
      <FirstLastTrialNode
        data={trials[0]}
        type={type}
        styles={styles}
        viewType={viewType}
        visibleIsBest={visibleIsBest}
        getMetricColor={getMetricColor}
        getFontColor={getFontColor}
      />
    );
  }

  return (
    <DefaultTrialNode
      data={trials[0]}
      styles={styles}
      viewType={viewType}
      visibleIsBest={visibleIsBest}
      getMetricColor={getMetricColor}
      getFontColor={getFontColor}
    />
  );
};
