import { BandProps } from "./types";

import { useColorScale } from "../../utils/colorScale";
import {
  hpTypeIcons,
  timelineIcons as icons,
  notiTypeIcons,
} from "../../utils/icon";
import { useExperimentStore } from "../../stores/experimentStore";
import { HyperparamTypes } from "../../types";
import { formatDate, formatDistance } from "../../utils";
interface LinkDetailProps {
  data: BandProps;
}
type LinkDetailEvent = {
  time: number;
  name: string;
  type: string;
  data: any | any[];
  icon?: any;
};

const LinkDetail = ({ data }: LinkDetailProps) => {
  console.log("LinkDetail data:", data);

  const { getMetricColor } = useColorScale();

  const linkData = [] as LinkDetailEvent[];
  const hyperparams = useExperimentStore((state) => state.hyperparams);

  if (data && data.next) {
    console.log("LinkDetail data.next:", data.next);
    const firstTrial = data.next.data?.trials[0];
    if (firstTrial && data.next.data?.type !== "pseudo") {
      linkData.push({
        time: firstTrial.startTime,
        name: `${firstTrial.event} Started`,
        type: data.next.data?.type || "trial",
        data: firstTrial,
      });
      if (firstTrial.status === "done") {
        linkData.push({
          time: firstTrial.endTime,
          name: `${firstTrial.event} Done`,
          type: data.next.data?.type || "trial",
          data: firstTrial,
        });
      } else if (firstTrial.status === "paused") {
        linkData.push({
          time: firstTrial.endTime,
          name: `${firstTrial.event} Paused`,
          type: data.next.data?.type || "trial",
          data: firstTrial,
        });
      }
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
      switch (event.type) {
        case "visibility":
          event.data.forEach((value: any) => {
            // console.lov("value:", value);
            linkData.push({
              time: value.startTime,
              name: "User viewing",
              type: "visibility",
              data: value,
              icon: icons.visibility,
            });
            linkData.push({
              time: value.endTime,
              name: "User stopped viewing",
              type: "nonVisibility",
              data: value,
              icon: icons.nonVisibility,
            });
          });
          break;
        case "push":
          event.data.forEach((push: any) => {
            if (push.type === "timeout") {
              linkData.push({
                time: push.time,
                name: push.content,
                type: "timeout",
                data: push,
                icon: icons.timeout,
              });
            } else {
              // console.log("push:", push);
              linkData.push({
                time: push.time,
                name: `${push.title}: ${push.content}`,
                type: "push",
                data: push,
                icon: icons.push,
              });
            }
          });
          break;
        case "addCondition": {
          event.data.forEach((cond: any) => {
            linkData.push({
              time: cond.time,
              name: "Add notification condition",
              // type: event.type,
              type: "noti",
              data: cond.data,
              icon: icons[event.type],
            });
          });
          break;
        }
        case "editCondition": {
          event.data.forEach((cond: any) => {
            linkData.push({
              time: cond.time,
              name: "Edit notification condition",
              // type: event.type,
              type: "noti",
              data: cond.data,
              icon: icons[event.type],
            });
          });
          break;
        }
        case "deleteCondition": {
          event.data.forEach((cond: any) => {
            cond.data.active = false;
            linkData.push({
              time: cond.time,
              name: "Delete notification condition",
              type: "noti",
              data: cond.data,
              icon: icons[event.type],
            });
          });
          break;
        }
        case "narrowConfigspace":
          console.log("narrowConfigspace event:", event);
          console.log("narrowConfigspace event.data:", event.data);
          event.data.forEach((narrow: any) => {
            const narrowData: any[] = [];
            narrow.data.forEach((config: any) => {
              const hp = (hyperparams ?? []).find(
                (hp) => hp.name === config.name
              );
              console.log("config hp:", config);
              console.log("hp", hp?.getNarrowHistory(config));
              narrowData.push({
                // ...config,
                hp: hp,
                ...hp?.getNarrowHistory(config),
              });
            });
            console.log("narrowData:", narrowData);
            linkData.push({
              time: narrow.time,
              name: "Narrow configspace",
              type: "narrow",
              data: narrowData,
              icon: icons[event.type],
            });
          });
          break;
        case "addUserTrial":
          event.data.forEach((trial: any) => {
            console.log("addUserTrial trial:", trial);
            // (${trialId.slice(0, 3)})
            linkData.push({
              time: trial.time,
              name: `User Trial (${trial.data.id.slice(0, 3)}) Added`,
              type: "user",
              data: trial.data,
              icon: icons[event.type],
            });
          });
          break;
        case "experimentPause":
          event.data.forEach((pause: any) => {
            linkData.push({
              time: pause.time,
              name: "Experiment Paused",
              type: "pause",
              data: pause,
              icon: icons[event.type],
            });
          });
          break;
        case "experimentResume":
          event.data.forEach((resume: any) => {
            linkData.push({
              time: resume.time,
              name: "Experiment Resumed",
              type: "resume",
              data: resume,
              icon: icons[event.type],
            });
          });
          break;

        default:
          linkData.push({
            time: event.time,
            name: `${event.type} ${event.name || ""}`,
            type: event.type,
            data: event.data || [],
            icon: icons[event.type],
          });
          break;
      }
    });
  }
  linkData.sort((a, b) => b.time - a.time);

  return (
    <div className="w-full h-full flex flex-col">
      <div className=" border-b border-gray-300 pb-3 flex items-end gap-2 absolute top-5 left-5 right-5 z-10 bg-white">
        <p className="text-xl font-bold text-gray-600 ">
          {/* {formatDistanceStrict(data.endTime, data.startTime)} */}
          {formatDistance(data.startTime, data.endTime)}
        </p>
        <p className="text-xs ">
          {data !== null
            ? `${formatDate(data.startTime, "time")} - ${
                data.endTime ? formatDate(data.endTime, "time") : "N/A"
              }`
            : "N/A"}
        </p>
      </div>
      {linkData.length > 0 && (
        <div className="flex flex-col overflow-y-auto pt-[50px] pb-[90px]">
          {linkData.map((event, index) => {
            if (event.type === "noti") {
              const pair = event.data;
              console.log("LinkDetail pair:", pair);
              const Icon =
                pair.eventCond && pair.eventCond.type
                  ? notiTypeIcons[pair.eventCond.type]
                  : null; // Use the icon based on the type

              console.log("LinkDetail pair:", pair);

              return (
                <>
                  <div
                    key={index}
                    className="flex items-center gap-2 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center"
                        // style={{
                        //   backgroundColor:
                        //     event.type !== "pseudo" && event.type !== "link"
                        //       ? getMetricColor(event.data[0].metric)
                        //       : event.type === "link"
                        //       ? "#fff"
                        //       : "red",
                        // }}
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
                      {/* {format(event.time, "a HH:mm:ss")} */}
                      {formatDate(event.time, "time")}
                    </span>
                  </div>
                  <ul>
                    <li
                      key={index}
                      className="h-[70px] bg-white flex items-start w-full"
                    >
                      <div className="w-[30px] h-full flex justify-center">
                        <div
                          style={{
                            height: "100%",
                            width: "0px",
                            borderLeft: "2px solid #ccc",
                          }}
                        ></div>
                      </div>
                      <div
                        className="flex-1 flex gap-4 items-center justify-start p-1"
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRight: "0px",
                          borderLeft: "0px",
                        }}
                      >
                        {Icon && <Icon size={24} />}
                        <div className="flex flex-col justify-center items-start flex-1">
                          <p>{pair.eventCond?.toString()}</p>
                          <p className="text-xs">
                            {pair.eventCond.toContent()}
                          </p>
                        </div>
                        <div className="w-[20%] flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={pair.active}
                            // defaultChecked
                            className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                          />
                        </div>
                      </div>
                    </li>
                  </ul>
                  {/* {index < linkData.length - 1 && (
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
                  )} */}
                </>
              );
            } else if (event.type === "narrow") {
              return (
                <>
                  <div
                    key={index}
                    className="flex items-center gap-2 justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center">
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
                      {formatDate(event.time, "time")}
                    </span>
                  </div>
                  <div className="bg-white flex flex-col items-center justify-start w-full">
                    {event.data.map((config: any, idx: number) => {
                      const hp = config.hp;
                      const beforeChange = config.beforeChange;
                      const afterChange = config.afterChange;
                      const Icon =
                        hpTypeIcons[HyperparamTypes[hp.type].toLowerCase()] ||
                        icons.hyperparameter;
                      return (
                        <div
                          key={idx}
                          className="bg-white flex items-center w-full h-[90px] "
                        >
                          <div className="w-[30px] h-full flex justify-center">
                            <div
                              style={{
                                height: "100%",
                                width: "0px",
                                borderLeft: "2px solid #ccc",
                              }}
                            ></div>
                          </div>
                          <div
                            className="h-full flex-1 flex flex-col gap-2 items-start justify-align"
                            style={{
                              borderBottom: "1px solid #e5e7eb",
                              padding: "8px 0",
                            }}
                          >
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              {Icon && <Icon size={20} />}
                              {hp && <div>{hp.name}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              {hp.type === HyperparamTypes.Uniform ? (
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Before: [{beforeChange[0]},{" "}
                                    {beforeChange[1]}]
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    After: [{afterChange[0]}, {afterChange[1]}]
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Before:{" "}
                                    {beforeChange.map(
                                      (v: any) => v.toString() + ", "
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    After:{" "}
                                    {afterChange.map(
                                      (v: any) => v.toString() + ", "
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            }

            return (
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
                            ? getMetricColor(event.data.metric)
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
                        .split(/(Started|Done|Paused)/)
                        .map((part, i) =>
                          part === "Started" ||
                          part === "Done" ||
                          part === "Paused" ? (
                            <strong key={i}>{part}</strong>
                          ) : (
                            part
                          )
                        )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(event.time, "time")}
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
            );
          })}
        </div>
      )}
    </div>
  );
};
export default LinkDetail;
