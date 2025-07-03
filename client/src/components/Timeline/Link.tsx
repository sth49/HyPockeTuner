/* eslint-disable @typescript-eslint/no-explicit-any */
import { timelineIcons as icons } from "../../utils/icon";

import { Direction, LinkProps, Sizes } from "./types";
import {
  BAND_COLORS,
  BAND_PADDING,
  BORDER_STYLES,
  BORDER_WIDTH,
} from "../../constants/timelineLayout";

export const Link: React.FC<
  LinkProps & {
    isVertical: boolean;
    sizes: Sizes;
    dir?: Direction;
  }
> = (props) => {
  const { isVertical, sizes, type, events, dir, trials } = props;
  const { linkWidth, bandWidth } = sizes;

  const isDashed = trials[0].type === "user" || type === "paused";
  const borderStyle = isDashed ? BORDER_STYLES.DASHED : BORDER_STYLES.SOLID;
  const borderColor = BAND_COLORS.DEFAULT_BORDER;

  const lineStyle: React.CSSProperties = {
    ...(isVertical
      ? {
          width: "0px",
          height: "100%",
          borderLeft: `${BORDER_WIDTH.LINK} ${borderStyle} ${borderColor}`,
        }
      : {
          width: `${linkWidth + BAND_PADDING * 2}px`,
          height: "0px",
          borderTop: `${BORDER_WIDTH.LINK} ${borderStyle} ${borderColor}`,
          //   left: "0px",
        }),
  };

  return (
    <div
      className="flex items-center justify-center relative"
      style={{
        width: isVertical
          ? `${bandWidth}px`
          : `${linkWidth + BAND_PADDING * 2}px`,
        height: isVertical ? `${linkWidth + BAND_PADDING * 2}px` : "100%",
      }}
    >
      <div style={lineStyle} className="z-100"></div>
      {/* {data && data} */}
      {events.length > 0 && (
        <div
          className="absolute flex"
          style={{
            top: isVertical ? `0` : "calc(50% - 20px)",
            left: isVertical ? "calc(50% - 20px)" : 0,
            width: isVertical ? "40px" : "100%",
            height: isVertical ? "100%" : "40px",
            zIndex: 100,
          }}
        >
          <div
            className="flex w-full h-full flex relative justify-center"
            style={{
              flexDirection: isVertical ? "row" : "column",
            }}
          >
            <LinkEvents
              isVertical={isVertical}
              sizes={sizes}
              dir={dir}
              events={events.filter((_item, i) => i % 2 === 0)}
              position="top"
              numOfEvents={events.length}
            />
            <LinkEvents
              isVertical={isVertical}
              sizes={sizes}
              dir={dir}
              events={events.filter((_item, i) => i % 2 === 1)}
              position="bottom"
              numOfEvents={events.length}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const LinkEvents: React.FC<{
  isVertical: boolean;
  sizes: Sizes;
  dir?: Direction;
  events: any[];
  position: "top" | "bottom";
  numOfEvents: number;
}> = ({ isVertical, sizes, dir, events, position, numOfEvents }) => {
  const { gap, eventWidth } = sizes;
  const sortedEvents = [...events].sort((a, b) => {
    if (isVertical) {
      return b.time - a.time;
    }
    if (dir === "ltr") {
      return a.time - b.time;
    }
    return b.time - a.time;
  });
  const spacingProps = {
    ...(isVertical
      ? {
          paddingTop: position === "top" ? "10px" : "0px",
          paddingBottom: position === "bottom" ? "10px" : "0px",
        }
      : {
          paddingRight:
            !isVertical &&
            ((dir === "ltr" && position === "top") ||
              (dir === "rtl" && position === "bottom"))
              ? "10px"
              : "0px",
          paddingLeft:
            !isVertical &&
            ((dir === "ltr" && position === "bottom") ||
              (dir === "rtl" && position === "top"))
              ? "10px"
              : "0px",
        }),
  };

  return (
    <div
      style={{
        width: isVertical ? "20px" : "100%",
        height: isVertical ? "100%" : `20px`,
        display: "flex",
        alignItems: "center",
        flexDirection: isVertical ? "column" : "row",
        justifyContent: "center",
        ...(numOfEvents % 2 === 0 ? spacingProps : {}),
        zIndex: 10,
      }}
    >
      {sortedEvents.map((event, index) => (
        <>
          <EventBox
            key={index}
            isVertical={isVertical}
            eventWidth={eventWidth}
            data={event}
            dir={dir}
            position={position}
          />
          {index !== sortedEvents.length - 1 && (
            <div
              style={{
                width: isVertical ? "100%" : gap,
                height: isVertical ? gap : "100%",
              }}
            />
          )}
        </>
      ))}
    </div>
  );
};

// 이벤트 렌더링을 위한 컴포넌트 분리
const EventBox: React.FC<{
  isVertical: boolean;
  eventWidth: number;
  data: any;
  dir?: Direction;
  position: "top" | "bottom";
}> = ({ isVertical, data, position, dir }) => {
  const IconComponent = icons[data.type as keyof typeof icons];
  const borderRadius = isVertical
    ? position === "top"
      ? "5px 0px 0px 5px"
      : "0px 5px 5px 0px"
    : position === "top"
    ? "5px 5px 0px 0px"
    : "0px 0px 5px 5px";

  const badgePosition = isVertical
    ? position === "top"
      ? "indicator-top indicator-start"
      : "indicator-top indicator-end"
    : position === "top"
    ? dir === "rtl"
      ? "indicator-top indicator-end"
      : "indicator-top indicator-start"
    : dir === "rtl"
    ? "indicator-bottom indicator-end"
    : "indicator-bottom indicator-start";

  return (
    <div
      className="text-gray-500 indicator"
      style={{
        // width: isVertical ? "20px" : `${eventWidth - 2}px`,
        // height: isVertical ? `${eventWidth - 2}px` : "20px",
        width: "20px",
        height: "20px",
        backgroundColor: "white",
        border: `1px solid oklch(87.2% 0.01 258.338)`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: borderRadius,
      }}
    >
      {data.data && data.data.length > 1 && (
        <span
          className={
            "indicator-item badge badge-error badge-xs" + " " + badgePosition
          }
          style={{
            width: "10px",
            height: "10px",
            padding: "0px",
            position: "absolute",
            color: "white",
          }}
        >
          <p className="text-[0.5rem] text-white font-bold">
            {data.data.length || 0}
          </p>
        </span>
      )}

      {IconComponent && <IconComponent />}
    </div>
  );
};
