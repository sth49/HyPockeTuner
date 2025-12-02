/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import {
  BorderRadiusString,
  Direction,
  NodePosition,
  Sizes,
  BandProps,
} from "./types";

const CONFIG = {
  NODES_PER_ROW: 3,
  LINKS_PER_ROW: 2,
  COLORS: {
    BAND: ["#F5EFE8", "#E8F0F5"],
    DEFAULT_BORDER: "oklch(87.2% 0.01 258.338)",
    WHITE: "white",
  },
  BORDER_STYLES: {
    SOLID: "solid",
    DASHED: "dashed",
  },
  BORDER_WIDTH: "3px",
};

const getNodePosition = (
  order = 0,
  dir: Direction = "ltr"
): [NodePosition, string] => {
  const { NODES_PER_ROW, LINKS_PER_ROW } = CONFIG;

  if (order % (NODES_PER_ROW * 2) === 0) {
    const rowIdx = Math.floor(order / (NODES_PER_ROW * 2));
    if (rowIdx % 2 === 0) {
      return ["ltr-start", "red"];
    } else {
      return ["rtl-start", "pink"];
    }
  } else if (order % (NODES_PER_ROW * 2) === LINKS_PER_ROW * 2) {
    const adjustedOrder = order - LINKS_PER_ROW * 2;
    const rowIdx = Math.floor(adjustedOrder / (NODES_PER_ROW * 2));
    if (rowIdx % 2 === 0) {
      return ["ltr-end", "green"];
    } else {
      return ["rtl-end", "blue"];
    }
  }
  return dir === "ltr" ? ["ltr-middle", "yellow"] : ["rtl-middle", "yellow"];
};

// const getNodePosition = (
//   order = 0,
//   dir: Direction = "ltr"
// ): [NodePosition, string] => {
//   const { NODES_PER_ROW, LINKS_PER_ROW } = CONFIG;

//   if (order % (NODES_PER_ROW * 2) === 0) {
//     const rowIdx = Math.floor(order / (NODES_PER_ROW * 2));
//     if (rowIdx % 2 === 0) {
//       return ["rtl-start", "red"];
//     } else {
//       return ["ltr-start", "pink"];
//     }
//   } else if (order % (NODES_PER_ROW * 2) === LINKS_PER_ROW * 2) {
//     const adjustedOrder = order - LINKS_PER_ROW * 2;
//     const rowIdx = Math.floor(adjustedOrder / (NODES_PER_ROW * 2));
//     if (rowIdx % 2 === 0) {
//       return ["rtl-end", "green"];
//     } else {
//       return ["ltr-end", "blue"];
//     }
//   }
//   return dir === "ltr" ? ["ltr-middle", "yellow"] : ["rtl-middle", "yellow"];
// };


const getNodeDirection = (
  props: BandProps & { dir?: Direction }
): [BorderRadiusString] => {
  const { order, data, dir } = props;

  if (!data || !data.trials || data.trials.length === 0) {
    return ["0px"];
  }

  let borderRadius: BorderRadiusString = "0px";
  // let color = "white";
  const [position] = getNodePosition(order, dir);
  const isLastBracketTrial =
    data.trials[data.trials.length - 1].isLastBracket ||
    data.trials[data.trials.length - 1].isLastExperiment;

  switch (position) {
    case "rtl-start":
      borderRadius =
        data.type === "pseudo"
          ? "0px 3px 3px 0px"
          : isLastBracketTrial
          ? "3px 3px 0px 3px"
          : "0px 3px 0px 0px";
      // color = "red";
      break;
    case "ltr-start":
      borderRadius =
        data.type === "pseudo"
          ? "3px 0px 0px 3px"
          : isLastBracketTrial
          ? "3px 3px 3px 0px"
          : "3px 0px 0px 0px";
      // color = "blue";
      break;
    case "rtl-end":
      borderRadius =
        data.type === "pseudo"
          ? "0px 10px 3px 3px"
          : isLastBracketTrial
          ? "3px 0px 0px 3px"
          : "0px 0px 0px 3px";
      // color = "green";
      break;
    case "ltr-end":
      borderRadius =
        data.type === "pseudo"
          ? "3px 0px 3px 3px"
          : isLastBracketTrial
          ? "0px 3px 3px 0px"
          : "0px 0px 3px 0px";
      // color = "yellow";
      break;
    case "ltr-middle":
      borderRadius =
        data.type === "pseudo"
          ? "3px 0px 0px 3px"
          : isLastBracketTrial
          ? "0px 3px 3px 0px"
          : "0px";
      // color = "pink";
      break;
    case "rtl-middle":
      borderRadius =
        data.type === "pseudo"
          ? "0px 3px 3px 0px"
          : isLastBracketTrial
          ? "3px 0px 0px 3px"
          : "0px";
      // color = "pink";
      break;
    default:
      borderRadius = "0px";
      // color = "white";
      break;
  }

  // console.log(
  //   "type:",
  //   data.type,
  //   "position:",
  //   position,
  //   "borderRadius:",
  //   borderRadius
  // );

  return [borderRadius];
};

const UserBand: React.FC<{
  bracket?: number;
  sizes: Sizes;
  dir?: Direction;
  direction: NodePosition;
}> = ({ bracket, sizes, direction }) => {
  const { bandWidth, bandHeight, linkWidth } = sizes;
  if (direction === "ltr-start") {
    return (
      <div
        className="absolute top-0 left-0 w-full h-full z-5 bg-white"
        style={{
          width: `${bandWidth + linkWidth}px`,
          height: `${bandHeight + linkWidth}px`,
        }}
      >
        <div
          className="flex items-center justify-center absolute top-0 right-0 "
          style={{
            width: `${bandWidth / 2 + linkWidth}px`,
            height: `${bandHeight}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
          }}
        ></div>
        <div
          className="h-full flex flex-col items-center justify-center absolute bottom-0 left-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + bandHeight / 2}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        ></div>
      </div>
    );
  } else if (direction === "rtl-start") {
    return (
      <div
        className="absolute top-0 right-0 w-full h-full justify-center z-5 bg-white"
        style={{
          width: `${bandWidth + linkWidth}px`,
          height: `${bandHeight + linkWidth}px`,
        }}
      >
        <div
          className="flex items-center justify-center absolute top-0 left-0 "
          style={{
            width: `${bandWidth / 2 + linkWidth}px`,
            height: `${bandHeight}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(100% 50%, 0% 0%, 0% 100%)",
          }}
        ></div>
        <div
          className="h-full flex flex-col items-center justify-center absolute bottom-0 right-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + bandHeight / 2}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        ></div>
      </div>
    );
  } else if (direction === "ltr-end") {
    return (
      <div
        className="absolute bottom-0 right-0 w-full h-full justify-center z-5 bg-white"
        style={{
          width: `${bandWidth + linkWidth}px`,
          height: `${bandHeight + linkWidth}px`,
        }}
      >
        <div
          className="flex items-center justify-center absolute bottom-0 left-0 "
          style={{
            width: `${bandWidth / 2 + linkWidth}px`,
            height: `${bandHeight}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(100% 50%, 0% 0%, 0% 100%)",
          }}
        ></div>
        <div
          className="h-full flex flex-col items-center justify-center absolute top-0 right-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + bandHeight / 2}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
          }}
        ></div>
      </div>
    );
  } else if (direction === "rtl-end") {
    return (
      <div
        className="absolute bottom-0 left-0 w-full h-full justify-center z-5 bg-white"
        style={{
          width: `${bandWidth + linkWidth}px`,
          height: `${bandHeight + linkWidth}px`,
        }}
      >
        <div
          className="flex items-center justify-center absolute bottom-0 right-0 "
          style={{
            width: `${bandWidth / 2 + linkWidth}px`,
            height: `${bandHeight}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
          }}
        ></div>
        <div
          className="h-full flex flex-col items-center justify-center absolute top-0 left-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + bandHeight / 2}px`,
            backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
          }}
        ></div>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 w-full h-full flex items-center justify-center z-5 bg-white"
      style={{
        // left: dir === "ltr" ? `${-linkWidth}px` : 0,
        width: `${linkWidth + bandHeight + linkWidth * 2}px`,
        // backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
      }}
    >
      <div
        className="w-[10%] h-full "
        style={{
          backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],

          // clipPath: "polygon(100% 50%, 0% 0%, 0% 100%)",
        }}
      ></div>
      <div
        className="w-[40%] h-full "
        style={{
          backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],

          clipPath: "polygon(100% 50%, 0% 0%, 0% 100%)",
        }}
      ></div>
      <div
        className="w-[40%] h-full "
        style={{
          backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],

          clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
        }}
      ></div>
      <div
        className="w-[10%] h-full "
        style={{
          backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],

          // clipPath: "polygon(100% 50%, 0% 0%, 0% 100%)",
        }}
      ></div>
    </div>
  );
};

const MiniBand: React.FC<
  BandProps & {
    sizes: Sizes;
    isVertical?: boolean;
    dir?: Direction;
    isCollapse?: boolean;
    mergeType?: "individual" | "bracket" | "round" | "all";
    searchType?: string; // Optional prop for search type
    isCurrentFocusedLink?: boolean; // Optional prop to indicate if this link is currently focused
  }
> = (props) => {
  const {
    type,
    bracket,
    data,
    sizes,
    isVertical = false,
    dir = "ltr",
    searchType = "", // Default to empty string if not provided
    isCollapse = false,
    isCurrentFocusedLink = false, // Default to false if not provided
    mergeType,
  } = props;

  if (!data) {
    return null;
  }

  // const sizes: Sizes = {
  //   bandWidth: 15,
  //   bandHeight: 10,
  //   linkWidth: 6,
  //   nodeWidth: 0,
  //   nodeHeight: 0,
  //   gap: 0,
  //   eventWidth: 0,
  // };

  const { bandWidth, bandHeight, linkWidth, linkHeight } = sizes;

  // console.log("Band props:", props);

  const [borderRadius] = getNodeDirection(props);
  // const bgColor =
  //   // mergeType === "all" ||
  //   (type === "link" && data.type === "pseudo") ||
  //   data.type === "user" ||
  //   bracket === -2
  //     ? CONFIG.COLORS.WHITE
  //     : bracket === -1
  //     ? "oklch(92% 0.004 286.32)"
  //     : CONFIG.COLORS.BAND[(bracket ?? 0) % 2];

  const bgColor =
    // mergeType === "all" ||
    (type === "link" && data.type === "pseudo") || bracket === -2
      ? CONFIG.COLORS.WHITE
      : bracket === -1
      ? "oklch(92% 0.004 286.32)" // pseudo
      : CONFIG.COLORS.BAND[(bracket ?? 0) % 2];

  const direction = getNodePosition(props.order, dir)[0];
  const isCollapsedUserTrial =
    isCollapse &&
    data.type === "user" &&
    data.trials?.some((trial) => trial.type === "user");
  const finalBgColor = isCollapsedUserTrial ? CONFIG.COLORS.BAND[0] : bgColor;
  console.log("finalBgColor:", finalBgColor);
  
  // console.log("bracket:", bracket, "type:", type, "bgColor", bgColor);
  if (type === "link") {
    // Only access events if data is LinkProps
    const events = "events" in data ? data.events || [] : [];
    // console.log("Events:", events);
    // console.log("searchType:", searchType);
    const isInSearchType = events.some((event) => event.type === searchType);

    // console.log("isInSearchType:", isInSearchType);

    return (
      <div
        style={{
          width: `${isVertical ? bandWidth : linkWidth}px`,
          height: `${isVertical ? linkHeight : bandHeight}px`,
          backgroundColor: isInSearchType
            ? "oklch(77.464% 0.062 217.469)"
            : finalBgColor,
          opacity: isInSearchType && !isCurrentFocusedLink ? 0.5 : 1,
          backgroundImage:
            bracket === -1
              ? `
      repeating-linear-gradient(
      45deg,
        ${CONFIG.COLORS.BAND[1]} 0px,
        ${CONFIG.COLORS.BAND[1]} 8px,
        ${CONFIG.COLORS.BAND[0]} 8px,
        ${CONFIG.COLORS.BAND[0]} 16px
      )
    `
              : "none",
        }}
        className="flex justify-center items-center relative"
      >
        
        {isVertical && data.type !== "pseudo" && (
          <div
            className="absolute"
            style={{
              top: 0,
              left: dir === "ltr" ? "0px" : "calc(100% - 1px)",
              width: "1px",
              height: "100%",
              backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            }}
          >
            <div
              className="absolute"
              style={{
                width: "100%",
                height: "100%",
                borderRadius:
                  dir === "ltr" ? "0px 1px 1px 0px" : "1px 0px 0px 1px",
                backgroundColor: CONFIG.COLORS.WHITE,
              }}
            ></div>
          </div>
        )}
        
        {!isCollapse &&
          data.trials.length > 0 &&
          data.trials[0].isFirstRound &&
          data.trials[0].roundId !== 1 && (
            <div
              className="absolute"
              style={{
                top: isVertical ? "calc(50% - 1.5px)" : 0,
                left: isVertical ? `0` : "calc(50% - 1.5px)",
                width: isVertical ? "100%" : "3px",
                height: isVertical ? "3px" : "100%",
                backgroundColor: CONFIG.COLORS.WHITE,
                zIndex: 100,
              }}
            ></div>
          )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center relative`}
      style={{
        width: `${bandWidth}px`,
        height: `${bandHeight}px`,
        backgroundColor: finalBgColor,
        backgroundImage:
          bracket === -1
            ? `
      repeating-linear-gradient(
      45deg,
        ${CONFIG.COLORS.BAND[1]} 0px,
        ${CONFIG.COLORS.BAND[1]} 2px,
        ${CONFIG.COLORS.BAND[0]} 2px,
        ${CONFIG.COLORS.BAND[0]} 4px
      )
    `
            : "none",
        borderRadius: borderRadius,
      }}
    >
      {mergeType !== "all" && data.trials[0].type === "user" && !isCollapse && (
        <UserBand
          bracket={bracket}
          sizes={sizes}
          dir={dir}
          direction={direction}
        />
      )}
    </div>
  );
};

export default MiniBand;
