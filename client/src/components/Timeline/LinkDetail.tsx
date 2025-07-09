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
import { useMemo, useState } from "react";
import { ConditionFactory } from "../../models/notification";
import { BAND_COLORS } from "../../constants/timelineLayout";

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

const EventTitle = {
  addCondition: "You added a notification condition",
  editCondition: "You edited a notification condition",

  visibility: "You accessed the system",
  nonVisibility: "You left the system",

  push: "You received a push notification",
  timeout: "Timeout",
  narrow: "You narrowed down the space",
  user: "You added a trial",
  pause: "You paused the experiment",
  resume: "You resumed the experiment",
};

const LinkDetail = ({ data }: LinkDetailProps) => {
  console.log("LinkDetail data:", data);

  const { getMetricColor } = useColorScale();

  // const linkData = [] as LinkDetailEvent[];
  const hyperparams = useExperimentStore((state) => state.hyperparams);

  const [isVisible, setIsVisible] = useState(false);

  const linkData = useMemo(() => {
    const newLinkData = [] as LinkDetailEvent[];

    // 기존 linkData 생성 로직

    if (data && data.prev) {
      console.log("LinkDetail data.prev:", data.prev);
      const firstTrial = data.prev.data?.trials[0];
      if (firstTrial && data.prev.data?.type !== "pseudo") {
        if (firstTrial.status === "done") {
          newLinkData.push({
            time: firstTrial.endTime,
            name: `${firstTrial.event} finished`,
            type: data.prev.data?.type || "trial",
            data: firstTrial,
          });
        } else if (firstTrial.status === "paused") {
          newLinkData.push({
            time: firstTrial.endTime,
            name: `${firstTrial.event} was paused`,
            type: data.prev.data?.type || "trial",
            data: firstTrial,
          });
        }
      } else if (firstTrial && data.prev.data?.type === "pseudo") {
        newLinkData.push({
          time: firstTrial.startTime,
          name: `${firstTrial.event} started`,
          type: data.prev.data?.type || "trial",
          data: firstTrial,
        });
      }
    }

    if (data && data.next) {
      console.log("LinkDetail data.next:", data.next);
      const firstTrial = data.next.data?.trials[0];
      if (firstTrial && data.next.data?.type !== "pseudo") {
        newLinkData.push({
          time: firstTrial.startTime,
          name: `${firstTrial.event} started`,
          type: data.next.data?.type || "trial",
          data: firstTrial,
        });
        if (firstTrial.status === "done") {
          newLinkData.push({
            time: firstTrial.endTime,
            name: `${firstTrial.event} finished`,
            type: data.next.data?.type || "trial",
            data: firstTrial,
          });
        } else if (firstTrial.status === "paused") {
          newLinkData.push({
            time: firstTrial.endTime,
            name: `${firstTrial.event} was paused`,
            type: data.next.data?.type || "trial",
            data: firstTrial,
          });
        }
      } else if (firstTrial && data.next.data?.type === "pseudo") {
        newLinkData.push({
          time: firstTrial.startTime,
          name: `${firstTrial.event} started`,
          type: data.next.data?.type || "trial",
          data: firstTrial,
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
        switch (event.type) {
          case "visibility":
            event.data.forEach((value: any) => {
              newLinkData.push({
                time: value.startTime,
                // name: "User viewing",
                name: EventTitle.visibility,
                type: "visibility",
                data: value,
                icon: icons.visibility,
              });
              // newLinkData.push({
              //   time: value.endTime,
              //   // name: "User stopped viewing",
              //   name: EventTitle.nonVisibility,
              //   type: "nonVisibility",
              //   data: value,
              //   icon: icons.nonVisibility,
              // });
            });
            break;
          case "push":
            event.data.forEach((push: any) => {
              if (push.type === "timeout") {
                newLinkData.push({
                  time: push.time,
                  // name: push.content,
                  name: EventTitle.push,
                  type: "timeout",
                  data: push,
                  icon: icons.timeout,
                });
              } else {
                // console.log("push:", push);
                newLinkData.push({
                  time: push.time,
                  // name: `${push.title}: ${push.content}`,
                  name: EventTitle.push,
                  type: "push",
                  data: push,
                  icon: icons.push,
                });
              }
            });
            break;
          case "addCondition": {
            event.data.forEach((cond: any) => {
              newLinkData.push({
                time: cond.time,
                // name: "Add notification condition",
                name: EventTitle.addCondition,
                // type: event.type,
                type: event.type,
                data: cond.data,
                icon: icons[event.type],
              });
            });
            break;
          }
          case "editCondition": {
            event.data.forEach((cond: any) => {
              newLinkData.push({
                time: cond.time,
                // name: "Edit notification condition",
                name: EventTitle.editCondition,
                // type: event.type,
                type: event.type,
                data: cond.data,
                icon: icons[event.type],
              });
            });
            break;
          }
          // case "deleteCondition": {
          //   event.data.forEach((cond: any) => {
          //     cond.data.active = false;
          //     newLinkData.push({
          //       time: cond.time,
          //       name: "Delete notification condition",
          //       type: "noti",
          //       data: cond.data,
          //       icon: icons[event.type],
          //     });
          //   });
          //   break;
          // }
          case "narrowConfigspace":
            // console.log("narrowConfigspace event:", event);
            // console.log("narrowConfigspace event.data:", event.data);
            event.data.forEach((narrow: any) => {
              const narrowData: any[] = [];
              narrow.data.forEach((config: any) => {
                const hp = (hyperparams ?? []).find(
                  (hp) => hp.name === config.name
                );
                // console.log("config hp:", config);
                // console.log("hp", hp?.getNarrowHistory(config));
                narrowData.push({
                  // ...config,
                  hp: hp,
                  ...hp?.getNarrowHistory(config),
                });
              });
              // console.log("narrowData:", narrowData);
              newLinkData.push({
                time: narrow.time,
                // name: "Narrow configspace",
                name: EventTitle.narrow,
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
              newLinkData.push({
                time: trial.time,
                // name: `User Trial (${trial.data.id.slice(0, 3)}) Added`,
                name: EventTitle.user,
                type: "user",
                data: trial.data,
                icon: icons[event.type],
              });
            });
            break;
          case "experimentPause":
            event.data.forEach((pause: any) => {
              newLinkData.push({
                time: pause.time,
                // name: "Experiment Paused",
                name: EventTitle.pause,
                type: "pause",
                data: pause,
                icon: icons[event.type],
              });
            });
            break;
          case "experimentResume":
            event.data.forEach((resume: any) => {
              newLinkData.push({
                time: resume.time,
                // name: "Experiment Resumed",
                name: EventTitle.resume,
                type: "resume",
                data: resume,
                icon: icons[event.type],
              });
            });
            break;

          default:
            newLinkData.push({
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
    newLinkData.sort((a, b) => b.time - a.time);

    return newLinkData.sort((a, b) => b.time - a.time);
  }, [data, hyperparams]);

  const displayData = useMemo(() => {
    return linkData.filter((event) => {
      return (
        event.type !== "visibility" ||
        (isVisible && event.type === "visibility")
      );
    });
  }, [linkData, isVisible]);

  return (
    <div className="w-full h-full flex flex-col ">
      <div className="h-[50px] border-b border-gray-300 pb-3 flex items-end justify-between gap-2 bg-white">
        <div className="flex gap-2">
          <p className="text-xl font-bold text-gray-600 ">
            {data.prev && data.prev.data
              ? `${data.prev.data.trials[0].event}`
              : "Link Details"}
          </p>
          <p className="text-xl">{" - "}</p>
          <p className="text-xl font-bold text-gray-600 ">
            {data.prev && data.prev.data
              ? `${data.next?.data?.trials[0]?.event}`
              : "Link Details"}
          </p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={isVisible}
          onChange={() => {
            setIsVisible(!isVisible);
          }}
        />
      </div>
      <div
        className="w-full h-full overflow-y-auto"
        style={{
          height: `calc(100% - 50px)`, // 50px는 상단 헤더 높이
        }}
      >
        {linkData.length > 0 && (
          <div className="flex flex-col overflow-y-auto pt-[30px] pb-[30px]">
            {displayData.map((event, index) => {
              if (["addCondition", "editCondition"].includes(event.type)) {
                const pair = event.data;
                const Icon =
                  pair.eventCond && pair.eventCond.type
                    ? notiTypeIcons[pair.eventCond.type]
                    : null; // Use the icon based on the type

                return (
                  <div key={`event-${event.type}-${event.time}-${index}`}>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center">
                          {event.icon && (
                            <event.icon
                              className="w-5 h-5 text-gray-500"
                              style={{ margin: "auto" }}
                            />
                          )}
                        </div>
                        <p className="font-sm">{event.name}</p>
                      </div>

                      <span className="text-xs text-gray-400">
                        {formatDate(
                          event.time,
                          index === displayData.length - 1 ? undefined : "time",
                          index < displayData.length - 1
                            ? displayData[index + 1].time
                            : undefined
                        )}
                      </span>
                    </div>
                    <ul>
                      <li
                        key={index}
                        className="h-[70px] bg-white flex items-center w-full"
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
                            {event.type === "editCondition" && (
                              <input
                                type="checkbox"
                                checked={pair.active}
                                // defaultChecked
                                className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                              />
                            )}
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                );
              } else if (event.type === "push") {
                const cond = ConditionFactory.fromJSON(event.data);
                console.log("Push event:", event);
                console.log("Push event:", cond);
                const Icon =
                  cond && cond.type ? notiTypeIcons[cond.type] : null;
                return (
                  <div key={`event-${event.type}-${event.time}-${index}`}>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center">
                          {event.icon && (
                            <event.icon
                              className="w-5 h-5 text-gray-500"
                              style={{ margin: "auto" }}
                            />
                          )}
                        </div>
                        <p className="font-sm">{event.name}</p>
                      </div>

                      <span className="text-xs text-gray-400">
                        {formatDate(
                          event.time,
                          index === displayData.length - 1 ? undefined : "time",
                          index < displayData.length - 1
                            ? displayData[index + 1].time
                            : undefined
                        )}
                      </span>
                    </div>
                    <ul>
                      <li
                        key={index}
                        className="h-[70px] bg-white flex items-center w-full"
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
                          <div className="flex flex-col justify-center items-start w-[90%]">
                            <p className="font-semibold">{event.data.title}</p>
                            <p className="text-xs">
                              {event.data.content} |{" "}
                              {formatDate(event.data.time)} (
                              {formatDistance(event.data.time)} ago)
                            </p>
                          </div>

                          {/* <div className="flex flex-col justify-center items-start flex-1">
                            <p>{pair.eventCond?.toString()}</p>
                            <p className="text-xs">
                              {pair.eventCond.toContent()}
                            </p>
                          </div>
                          <div className="w-[20%] flex items-center justify-center">
                            {event.type === "editCondition" && (
                              <input
                                type="checkbox"
                                checked={pair.active}
                                // defaultChecked
                                className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                              />
                            )} */}
                          {/* </div> */}
                        </div>
                      </li>
                    </ul>
                  </div>
                );
              } else if (event.type === "narrow") {
                return (
                  <div key={`event-${event.type}-${event.time}-${index}`}>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center">
                          {event.icon && (
                            <event.icon
                              className="w-5 h-5 text-gray-500"
                              style={{ margin: "auto" }}
                            />
                          )}
                        </div>
                        <p className="font-sm">{event.name}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(
                          event.time,
                          index === displayData.length - 1 ? undefined : "time",
                          index < displayData.length - 1
                            ? displayData[index + 1].time
                            : undefined
                        )}
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
                            className="bg-white flex items-center w-full h-[100px]"
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
                              <div className="flex items-center gap-2 ">
                                {hp.type === HyperparamTypes.Uniform ? (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-gray-500 w-[50px]">
                                        Before:{" "}
                                      </p>
                                      [{beforeChange[0]}, {beforeChange[1]}]
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-gray-500 w-[50px]">
                                        After:{" "}
                                      </p>
                                      [{afterChange[0]}, {afterChange[1]}]
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-gray-500 w-[50px]">
                                        Before:{" "}
                                      </p>
                                      <div className="flex gap-1">
                                        {beforeChange.map((v: any) => (
                                          <span
                                            className="btn btn-xs btn-primary text-white rounded-full"
                                            key={v}
                                          >
                                            {v.toString()}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-gray-500 w-[50px]">
                                        After:{" "}
                                      </p>
                                      <div className="flex gap-1">
                                        {afterChange.map((v: any) => (
                                          <span
                                            className="btn btn-xs btn-primary text-white rounded-full"
                                            key={v}
                                          >
                                            {v.toString()}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-white flex flex-col items-center justify-start w-full">
                      <div className="bg-white flex items-center w-full h-[30px]">
                        <div className="w-[30px] h-full flex justify-center">
                          <div
                            style={{
                              height: "100%",
                              width: "0px",
                              borderLeft: "2px solid #ccc",
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              console.log("event:", event);
              console.log("event:", event.data);

              return (
                // <div key
                <div key={`event-${event.type}-${event.time}-${index}`}>
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-[3px] w-[30px] h-[30px] border-[1px] border-gray-300 flex justify-center items-center"
                        style={{
                          backgroundColor:
                            event.type !== "pseudo" && event.type !== "link"
                              ? getMetricColor(event.data.metric)
                              : event.type === "pseudo"
                              ? BAND_COLORS.BAND[
                                  (event.data.bracketId ?? 0) % 2
                                ]
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
                      <p className="font-sm">
                        {event.name
                          .split(/(started|finished|paused)/)
                          .map((part, i) =>
                            part === "started" || part === "finished" ? (
                              <strong key={i}>{part}</strong>
                            ) : (
                              part
                            )
                          )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(
                        event.time,
                        index === displayData.length - 1 ? undefined : "time",
                        index < displayData.length - 1
                          ? displayData[index + 1].time
                          : undefined
                      )}
                    </span>
                  </div>
                  {index < displayData.length - 1 && (
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default LinkDetail;
