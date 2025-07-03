/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import {
  BorderRadiusString,
  Direction,
  NodePosition,
  Sizes,
  BandProps,
} from "./types";
import { Node } from "./Node";
import { Link } from "./Link";
import { BAND_PADDING } from "../../constants/timelineLayout";

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
  BORDER_WIDTH: "2px",
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

// 방향 계산을 위한 유틸리티 함수 개선
const getNodeDirection = (
  props: BandProps & { dir?: Direction; isCollapse?: boolean }
): [BorderRadiusString] => {
  const { order, data, dir, isCollapse } = props;

  if (!data || !data.trials || data.trials.length === 0) {
    return ["0px"];
  }

  let borderRadius: BorderRadiusString = "0px";
  // let color = "white";
  const [position] = getNodePosition(order, dir);
  const isLastBracketTrial =
    isCollapse && !data.trials.some((trial) => trial.isLastExperiment)
      ? false
      : data.trials[data.trials.length - 1].isLastBracket ||
        data.trials[data.trials.length - 1].isLastExperiment;

  switch (position) {
    case "rtl-start":
      borderRadius =
        data.type === "pseudo"
          ? "0px 10px 10px 0px"
          : isLastBracketTrial
          ? "10px 10px 0px 10px"
          : "0px 10px 0px 0px";
      // color = "red";
      break;
    case "ltr-start":
      borderRadius =
        data.type === "pseudo"
          ? "10px 0px 0px 10px"
          : isLastBracketTrial
          ? "10px 10px 10px 0px"
          : "10px 0px 0px 0px";
      // color = "blue";
      break;
    case "rtl-end":
      borderRadius =
        data.type === "pseudo"
          ? "0px 10px 10px 10px"
          : isLastBracketTrial
          ? "10px 0px 0px 10px"
          : "0px 0px 0px 10px";
      // color = "green";
      break;
    case "ltr-end":
      borderRadius =
        data.type === "pseudo"
          ? "10px 0px 10px 10px"
          : isLastBracketTrial
          ? "0px 10px 10px 0px"
          : "0px 0px 10px 0px";
      // color = "yellow";
      break;
    case "ltr-middle":
      borderRadius =
        data.type === "pseudo"
          ? "10px 0px 0px 10px"
          : isLastBracketTrial
          ? "0px 10px 10px 0px"
          : "0px";
      // color = "pink";
      break;
    case "rtl-middle":
      borderRadius =
        data.type === "pseudo"
          ? "0px 10px 10px 0px"
          : isLastBracketTrial
          ? "10px 0px 0px 10px"
          : "0px";
      // color = "pink";
      break;
    default:
      borderRadius = "0px";
      break;
  }

  if (isCollapse && order === 0) {
    borderRadius = "10px 0px 0px 10px"; // 첫 번째 노드
  }

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
        <svg
          className="absolute top-0 right-0"
          style={{
            width: `${linkWidth + BAND_PADDING}px`,
            height: `${bandHeight}px`,
          }}
        >
          <path
            d={`
              M 0 ${BAND_PADDING}
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${BAND_PADDING} 
                ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING / 2}
              Q ${(linkWidth + BAND_PADDING) * 0.66} 0 
                ${linkWidth + BAND_PADDING} 0
              L ${linkWidth + BAND_PADDING} ${bandHeight}
              Q ${(linkWidth + BAND_PADDING) * 0.66} ${bandHeight} 
                ${(linkWidth + BAND_PADDING) / 2} ${
              bandHeight - BAND_PADDING * 0.5
            }
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${
              bandHeight - BAND_PADDING
            } 
                0 ${bandHeight - BAND_PADDING}
              Z
            `}
            strokeLinecap="round"
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + BAND_PADDING}px`,
          }}
        >
          <path
            d={`
            M ${BAND_PADDING} 0
            Q ${BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${0} ${(linkWidth + BAND_PADDING) * 0.66}
              ${0} ${linkWidth + BAND_PADDING}
            L ${bandWidth} ${linkWidth + BAND_PADDING}
            Q ${bandWidth} ${(linkWidth + BAND_PADDING) * 0.66}
              ${bandWidth - BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${bandWidth - BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${bandWidth - BAND_PADDING} 0
            Z
              `}
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
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
        <svg
          className="absolute top-0 left-0 "
          style={{
            width: `${linkWidth + BAND_PADDING}px`,
            height: `${bandHeight}px`,
          }}
        >
          <path
            d={`
            M ${linkWidth + BAND_PADDING} ${BAND_PADDING}
            Q ${(linkWidth + BAND_PADDING) * 0.66} ${BAND_PADDING} 
              ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING * 0.5}
            Q ${(linkWidth + BAND_PADDING) * 0.33} 0 
              0 0
            L 0 ${bandHeight}
            Q ${(linkWidth + BAND_PADDING) * 0.33} ${bandHeight} 
              ${(linkWidth + BAND_PADDING) / 2} ${
              bandHeight - BAND_PADDING * 0.5
            }
            Q ${(linkWidth + BAND_PADDING) * 0.66} ${bandHeight - BAND_PADDING} 
              ${linkWidth + BAND_PADDING} ${bandHeight - BAND_PADDING}
            Z
          `}
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
        <svg
          className="absolute bottom-0 right-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + BAND_PADDING}px`,
          }}
        >
          <path
            d={`
            M ${BAND_PADDING} 0
            Q ${BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${0} ${(linkWidth + BAND_PADDING) * 0.66}
              ${0} ${linkWidth + BAND_PADDING}
            L ${bandWidth} ${linkWidth + BAND_PADDING}
            Q ${bandWidth} ${(linkWidth + BAND_PADDING) * 0.66}
              ${bandWidth - BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${bandWidth - BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${bandWidth - BAND_PADDING} 0
            Z
              `}
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
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
        <svg
          className="absolute bottom-0 left-0 "
          style={{
            width: `${linkWidth + BAND_PADDING}px`,
            height: `${bandHeight}px`,
          }}
        >
          <path
            d={`
              M ${linkWidth + BAND_PADDING} ${BAND_PADDING}
              Q ${(linkWidth + BAND_PADDING) * 0.66} ${BAND_PADDING} 
                ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING * 0.5}
              Q ${(linkWidth + BAND_PADDING) * 0.33} 0 
                0 0
              L 0 ${bandHeight}
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${bandHeight} 
                ${(linkWidth + BAND_PADDING) / 2} ${
              bandHeight - BAND_PADDING * 0.5
            }
              Q ${(linkWidth + BAND_PADDING) * 0.66} ${
              bandHeight - BAND_PADDING
            } 
                ${linkWidth + BAND_PADDING} ${bandHeight - BAND_PADDING}
              Z
            `}
            strokeLinecap="round"
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
        <svg
          className="absolute top-0 right-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + BAND_PADDING}px`,
          }}
        >
          <path
            d={`
            M 0 0
            Q ${0} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.66}
              ${BAND_PADDING} ${linkWidth + BAND_PADDING}
            L ${bandWidth - BAND_PADDING} ${linkWidth + BAND_PADDING}
            Q ${bandWidth - BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.66}
              ${bandWidth - BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${bandWidth} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${bandWidth} 0
            Z
              `}
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
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
        <svg
          className="absolute bottom-0 right-0"
          style={{
            width: `${linkWidth + BAND_PADDING}px`,
            height: `${bandHeight}px`,
          }}
        >
          <path
            d={`
              M 0 ${BAND_PADDING}
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${BAND_PADDING} 
                ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING / 2}
              Q ${(linkWidth + BAND_PADDING) * 0.66} 0 
                ${linkWidth + BAND_PADDING} 0
              L ${linkWidth + BAND_PADDING} ${bandHeight}
              Q ${(linkWidth + BAND_PADDING) * 0.66} ${bandHeight} 
                ${(linkWidth + BAND_PADDING) / 2} ${
              bandHeight - BAND_PADDING * 0.5
            }
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${
              bandHeight - BAND_PADDING
            } 
                0 ${bandHeight - BAND_PADDING}
              Z
            `}
            strokeLinecap="round"
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>

        <svg
          className="absolute top-0 left-0 "
          style={{
            width: `${bandWidth}px`,
            height: `${linkWidth + BAND_PADDING}px`,
          }}
        >
          <path
            d={`
            M 0 0
            Q ${0} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.66}
              ${BAND_PADDING} ${linkWidth + BAND_PADDING}
            L ${bandWidth - BAND_PADDING} ${linkWidth + BAND_PADDING}
            Q ${bandWidth - BAND_PADDING} ${(linkWidth + BAND_PADDING) * 0.66}
              ${bandWidth - BAND_PADDING / 2} ${(linkWidth + BAND_PADDING) / 2}
            Q ${bandWidth} ${(linkWidth + BAND_PADDING) * 0.33} 
              ${bandWidth} 0
            Z
              `}
            fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 w-full h-full flex items-center justify-center z-5 bg-white"
      style={{
        width: `${linkWidth * 2 + bandWidth}px`,
      }}
    >
      <svg
        className="absolute bottom-0 right-0 "
        style={{
          width: `${linkWidth + BAND_PADDING}px`,
          height: `${bandHeight}px`,
        }}
      >
        <path
          d={`
              M 0 ${BAND_PADDING}
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${BAND_PADDING} 
                ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING / 2}
              Q ${(linkWidth + BAND_PADDING) * 0.66} 0 
                ${linkWidth + BAND_PADDING} 0
              L ${linkWidth + BAND_PADDING} ${bandHeight}
              Q ${(linkWidth + BAND_PADDING) * 0.66} ${bandHeight} 
                ${(linkWidth + BAND_PADDING) / 2} ${
            bandHeight - BAND_PADDING * 0.5
          }
              Q ${(linkWidth + BAND_PADDING) * 0.33} ${
            bandHeight - BAND_PADDING
          } 
                0 ${bandHeight - BAND_PADDING}
              Z
            `}
          strokeLinecap="round"
          fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 "
        style={{
          width: `${linkWidth + BAND_PADDING}px`,
          height: `${bandHeight}px`,
        }}
      >
        <path
          d={`
            M ${linkWidth + BAND_PADDING} ${BAND_PADDING}
            Q ${(linkWidth + BAND_PADDING) * 0.66} ${BAND_PADDING} 
              ${(linkWidth + BAND_PADDING) / 2} ${BAND_PADDING * 0.5}
            Q ${(linkWidth + BAND_PADDING) * 0.33} 0 
              0 0
            L 0 ${bandHeight}
            Q ${(linkWidth + BAND_PADDING) * 0.33} ${bandHeight} 
              ${(linkWidth + BAND_PADDING) / 2} ${
            bandHeight - BAND_PADDING * 0.5
          }
            Q ${(linkWidth + BAND_PADDING) * 0.66} ${bandHeight - BAND_PADDING} 
              ${linkWidth + BAND_PADDING} ${bandHeight - BAND_PADDING}
            Z
          `}
          strokeLinecap="round"
          fill={CONFIG.COLORS.BAND[(bracket ?? 0) % 2]}
        />
      </svg>
    </div>
  );
};
// 메인 Node 컴포넌트
const Band: React.FC<
  BandProps & {
    sizes: Sizes;
    isVertical?: boolean;
    dir?: Direction;
    isCollapse?: boolean;
    mergeType?: "individual" | "bracket" | "round" | "all";
  }
> = (props) => {
  const {
    type,
    bracket,
    data,
    sizes,
    isVertical = false,
    dir = "ltr",
    isCollapse = false,
    mergeType = "individual",
  } = props;

  if (!data) {
    return null;
  }

  const { bandWidth, bandHeight, linkWidth } = sizes;

  // console.log("Band props:", props);

  const [borderRadius] = getNodeDirection(props);
  // const [direction, color] = getNodePosition(props.order, dir);
  const [direction] = getNodePosition(props.order, dir);
  const bgColor =
    // mergeType === "all" ||
    (type === "link" && data.type === "pseudo") ||
    data.type === "user" ||
    bracket === -2
      ? CONFIG.COLORS.WHITE
      : bracket === -1
      ? "oklch(92% 0.004 286.32)" // pseudo
      : CONFIG.COLORS.BAND[(bracket ?? 0) % 2];

  if (type === "link") {
    return (
      <div
        style={{
          width: `${isVertical ? bandWidth : linkWidth}px`,
          height: `${isVertical ? linkWidth : bandHeight}px`,
          backgroundColor: bgColor,
          backgroundImage:
            bracket === -1
              ? `
      repeating-linear-gradient(
      45deg,
        ${CONFIG.COLORS.BAND[1]} 0px,
        ${CONFIG.COLORS.BAND[1]} 4px,
        ${CONFIG.COLORS.BAND[0]} 4px,
        ${CONFIG.COLORS.BAND[0]} 8px
      )
    `
              : "none",
          // backgroundColor: color,
        }}
        className="flex justify-center items-center relative"
      >
        {/* 안쪽 보더 */}
        {isVertical && data.type !== "pseudo" && (
          <div
            className="absolute"
            style={{
              top: 0,
              left: dir === "ltr" ? "0px" : "calc(100% - 10px)",
              width: "10px",
              height: "100%",
              backgroundColor: CONFIG.COLORS.BAND[(bracket ?? 0) % 2],
            }}
          >
            <div
              className="absolute"
              style={{
                width: "100%",
                height: "100%",
                // borderRadius:
                //   dir === "ltr" ? "0px 5px 5px 0px" : "5px 0px 0px 5px",
                backgroundColor: CONFIG.COLORS.WHITE,
              }}
            ></div>
          </div>
        )}
        {/* 라운드 시작 밴드 끊김 */}
        {!isCollapse &&
          data.trials.length > 0 &&
          data.trials[0].isFirstRound &&
          data.trials[0].roundId !== 1 && (
            <div
              className="absolute"
              style={{
                top: isVertical ? "calc(50% - 5px)" : 0,
                left: isVertical ? `0` : "calc(50% - 5px)",
                width: isVertical ? "100%" : "10px",
                height: isVertical ? "10px" : "100%",
                backgroundColor: CONFIG.COLORS.WHITE,
              }}
            ></div>
          )}
        <Link
          {...data}
          events={("events" in data ? data.events : []) ?? []}
          isVertical={isVertical}
          sizes={sizes}
          dir={dir}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center relative`}
      style={{
        width: `${bandWidth}px`,
        height: `${bandHeight}px`,
        backgroundColor: bgColor,
        // backgroundColor: color,
        backgroundImage:
          bracket === -1
            ? `
      repeating-linear-gradient(
      45deg,
        ${CONFIG.COLORS.BAND[1]} 0px,
        ${CONFIG.COLORS.BAND[1]} 4px,
        ${CONFIG.COLORS.BAND[0]} 4px,
        ${CONFIG.COLORS.BAND[0]} 8px
      )
    `
            : "none",
        borderRadius: borderRadius,
      }}
    >
      {mergeType !== "all" && data.trials[0].type === "user" && (
        <UserBand
          bracket={bracket}
          sizes={sizes}
          dir={dir}
          direction={direction}
        />
      )}
      {/* 밴드 링크 */}

      <Node
        bandBracketId={bracket}
        {...data}
        sizes={sizes}
        visibleFirstLast={false}
        direction={direction}
        mergeType={mergeType}
      />
    </div>
  );
};

export default Band;
