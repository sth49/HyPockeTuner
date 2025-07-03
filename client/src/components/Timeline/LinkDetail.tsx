import { format, formatDistanceStrict } from "date-fns";
import { BandProps } from "./types";

import { useColorScale } from "../../utils/colorScale";
import { timelineIcons as icons } from "../../utils/icon";

interface LinkDetailProps {
  data: BandProps;
}
type LinkDetailEvent = {
  time: number;
  name: string;
  type: string;
  data: any[];
  icon?: any;
};

type LineStyle = {
  prev: LinkDetailEvent;
  next: LinkDetailEvent;
  dashed?: boolean;
  color?: string;
  width?: number;
};

const LinkDetail = ({ data }: LinkDetailProps) => {
  console.log("LinkDetail data:", data);

  const { getMetricColor } = useColorScale();

  const linkData = [] as LinkDetailEvent[];
  const lines = [] as LineStyle[];

  if (data && data.prev) {
    console.log("LinkDetail data.prev:", data.prev);
    const lastTrial = data.prev.data?.trials[data.prev.data?.trials.length - 1];
    if (lastTrial) {
      linkData.push({
        time: lastTrial.endTime * 1000,
        name: `${lastTrial.event} Done`,
        type: data.prev.data?.type || "trial",
        data: [lastTrial],
      });
    }
  }

  if (data && data.next) {
    console.log("LinkDetail data.next:", data.next);
    const firstTrial = data.next.data?.trials[0];
    if (firstTrial) {
      linkData.push({
        time: firstTrial.startTime * 1000,
        name: `${firstTrial.event} Started`,
        type: data.next.data?.type || "trial",
        data: [firstTrial],
      });
      linkData.push({
        time: firstTrial.endTime * 1000,
        name: `${firstTrial.event} Done`,
        type: data.next.data?.type || "trial",
        data: [firstTrial],
      });
    }
  }

  if (
    data &&
    data.data &&
    Array.isArray((data.data as { events?: any[] }).events)
  ) {
    const events = (data.data as { events: any[] }).events;
    console.log("LinkDetail data.data.events:", events);
    events.forEach((event: any) => {
      linkData.push({
        time: event.time * 1000,
        name: `${event.type} ${event.name || ""}`,
        type: event.type,
        data: [event],
        icon: icons[event.type],
      });
    });
  }
  linkData.sort((a, b) => b.time - a.time);
  linkData.forEach((event, index) => {
    if (index > 0) {
      const prev = linkData[index - 1];
      const next = event;
      const dashed = prev.type !== next.type || prev.data[0] !== next.data[0];
      const color = "oklch(87.2% 0.01 258.338)";

      lines.push({
        prev,
        next,
        dashed,
        color,
        width: 2,
      });
    }
  });

  console.log("LinkDetail linkData:", linkData);

  return (
    <>
      <div className=" border-b border-gray-300 pb-3 flex items-end gap-2">
        <p className="text-xl font-bold text-gray-600 ">
          {formatDistanceStrict(data.endTime * 1000, data.startTime * 1000)}
        </p>
        <p className="text-xs ">
          {data !== null
            ? `${format(data.startTime * 1000, "a HH:mm:ss")} - ${
                data.endTime ? format(data.endTime * 1000, "a HH:mm:ss") : "N/A"
              }`
            : "N/A"}
        </p>
      </div>
      {linkData.length > 0 && (
        <div className="flex flex-col">
          {linkData.map((event, index) => (
            <>
              <div
                key={index}
                className="flex items-center gap-2 justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center"
                    style={{
                      backgroundColor:
                        event.type !== "sudo" && event.type !== "link"
                          ? getMetricColor(event.data[0].metric)
                          : event.type === "link"
                          ? "#fff"
                          : "red",
                    }}
                  >
                    {event.icon && (
                      <event.icon
                        className="w-5 h-5 text-gray-500"
                        style={{ margin: "auto" }}
                      />
                    )}
                  </div>
                  {/* <p className="font-sm">{event.name}</p> */}
                  <p className="font-sm">
                    {event.name
                      .split(/(Started|Done)/)
                      .map((part, i) =>
                        part === "Started" || part === "Done" ? (
                          <strong key={i}>{part}</strong>
                        ) : (
                          part
                        )
                      )}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {format(event.time, "a HH:mm:ss")}
                </span>
              </div>
              {index < linkData.length - 1 && (
                <div className="w-[30px] h-[30px] flex justify-center">
                  <div
                    style={{
                      height: "100%",
                      width: "0px",
                      borderLeft: "2px solid #ccc",
                      // borderLeft: `${
                      //   lines[index] && lines[index].dashed ? "dashed" : "solid"
                      // } 2px ${lines[index]?.color || "#ccc"}`,
                    }}
                  ></div>
                </div>
              )}
            </>
          ))}
        </div>
      )}
    </>
  );
};
export default LinkDetail;
