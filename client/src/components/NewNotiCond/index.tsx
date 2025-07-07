import { useParams } from "react-router";
import { useNavigation } from "../../hooks/useNavigation";
import HeaderText from "../common/HeaderText";
import BottomButton from "../common/BottomButton";
import { useExperimentStore } from "../../stores/experimentStore";
import { progressColor2 } from "../../utils/color";
import { useEffect, useState } from "react";
import { CustomSelect } from "../CustomSelect";
import {
  BracketFinishCond,
  MetricImproveByCond,
  MetricImproveCond,
  MetricReachCond,
  NotiCond,
  NotiCondPair,
  RoundFinishCond,
  TimeoutCond,
} from "../../models/notification";
import { addMinutes, addHours } from "date-fns";

import { notiTypeIcons } from "../../utils/icon";
import ApiClient from "../../api/api";
import { formatting } from "../../utils/formatting";

const getTimeoutDate = (timeoutType: string): Date => {
  const now = new Date();
  switch (timeoutType) {
    case "1m":
      return addMinutes(now, 1);
    case "10m":
      return addMinutes(now, 10);
    case "30m":
      return addMinutes(now, 30);
    case "1h":
      return addHours(now, 1);
    case "2h":
      return addHours(now, 2);
    case "4h":
      return addHours(now, 4);
    case "6h":
      return addHours(now, 6);
    default:
      return now;
  }
};

const timeoutOptions = [
  { value: "1m", label: "1 minute later" },
  { value: "10m", label: "10 minutes later" },
  { value: "30m", label: "30 minutes later" },
  { value: "1h", label: "1 hour later" },
  { value: "2h", label: "2 hours later" },
  { value: "4h", label: "4 hours later" },
  { value: "6h", label: "6 hours later" },
];

const NewNotiCond = () => {
  const { notiCondType } = useParams<{ notiCondType: string }>();
  const { handleNavigate } = useNavigation();

  const brackets = useExperimentStore((state) => state.brackets);
  const numOfBrackets = brackets.length;
  const currRoundId = useExperimentStore((state) => state.currRoundId);
  const currBracketId = useExperimentStore((state) => state.currBracketId);
  // console.log("currBracketId:", currBracketId);
  // console.log("currRoundId:", currRoundId);
  const status = useExperimentStore((state) => state.status);
  const metric = useExperimentStore((state) => state.metric);
  const bestTrial = useExperimentStore((state) => state.bestTrial);

  const notiCondPairs = useExperimentStore((state) => state.notiCondPairs);
  const [state, setState] = useState({
    eventTarget: notiCondType === "progress" ? "bracket" : "metric",
    metricVerb: "improve",
    metricTarget: bestTrial ? bestTrial.metric : 0,
    by: "0.01",
    recurring: true,
    useTimeout: false,
    timeoutType: "10m",
    bracketId: currBracketId.toString() || "",
    roundId: currBracketId.toString() + "-" + currRoundId.toString() || "",
  });
  const getCondPair = (): NotiCondPair | null => {
    if (!checkConditionComplete()) return null;
    let eventCond: NotiCond | null = null;
    let timeoutCond: NotiCond | null = null;

    if (state.eventTarget === "metric") {
      if (state.metricVerb === "improveBy") {
        eventCond = new MetricImproveByCond(
          bestTrial ? bestTrial.metric ?? 0 : 0,
          +state.by,
          state.recurring
        );
      } else if (state.metricVerb === "reach") {
        eventCond = new MetricReachCond(
          +(state.metricTarget ?? 0),
          state.recurring
        );
      } else if (state.metricVerb === "improve") {
        eventCond = new MetricImproveCond(
          bestTrial ? bestTrial.metric ?? 0 : 0,
          state.recurring
        );
      }
    } else if (state.eventTarget === "bracket") {
      eventCond = new BracketFinishCond(parseInt(state.bracketId));
    } else if (state.eventTarget === "round") {
      const [bracketId, roundId] = state.roundId.split("-");
      eventCond = new RoundFinishCond(parseInt(bracketId), parseInt(roundId));
    }

    if (!eventCond) {
      throw new Error("eventCond is not assigned.");
    }

    if (!state.useTimeout) timeoutCond = null;
    else {
      timeoutCond = new TimeoutCond(getTimeoutDate(state.timeoutType));
    }

    return new NotiCondPair(eventCond, timeoutCond);
  };

  const [noti, setNoti] = useState(getCondPair());

  useEffect(() => {
    if (checkConditionComplete()) setNoti(getCondPair());
  }, [state]);

  const create = (): any => {
    const newNotiCondPair = getCondPair();
    if (newNotiCondPair) {
      notiCondPairs.unshift(newNotiCondPair);

      ApiClient.addCondition(newNotiCondPair);
    }
    handleNavigate("/main/notification");
  };

  function checkConditionComplete() {
    let eventCond = false;
    let timeoutCond = false;

    if (state.eventTarget === "metric") {
      if (state.metricVerb === "improveBy") {
        if (
          !isNaN(+state.by) &&
          bestTrial &&
          (bestTrial.metric ?? 0) + +state.by <= 100
        ) {
          eventCond = true;
        }
      } else if (state.metricVerb === "reach") {
        if (
          !isNaN(+(state.metricTarget ?? 0)) &&
          bestTrial &&
          (bestTrial.metric ?? 0) < +(state.metricTarget ?? 0)
        ) {
          eventCond = true;
        }
      } else if (state.metricVerb === "improve") {
        eventCond = true;
      }
    } else if (state.eventTarget === "bracket") {
      if (state.bracketId !== undefined) eventCond = true;
    } else if (state.eventTarget === "round") {
      if (state.roundId) eventCond = true;
    }
    if (!state.useTimeout) timeoutCond = true;
    else if (state.useTimeout) {
      timeoutCond = true;
    } else timeoutCond = false;

    return eventCond && timeoutCond && status !== "finished";
  }

  return (
    <div className="w-full h-full p-2 gap-2 flex flex-col overflow-y-auto">
      {notiCondType === "progress" && (
        <>
          <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
            <table>
              <thead className="p-2">
                <tr className="border-b border-gray-200">
                  <th className="p-2">B \ R</th>
                  {brackets[0].rounds.map((round, index) => (
                    <th key={index}>{round.roundId + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brackets.map((bracket, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="text-center  p-1">
                      {numOfBrackets - bracket.id}
                    </td>
                    {bracket.rounds.map((round, roundIndex) => (
                      <td
                        key={roundIndex}
                        className="text-center p-1 border-l border-gray-200"
                        style={{
                          color: "white",
                          backgroundColor:
                            round.trials.filter((t) => t.status === "done")
                              .length !== round.trials.length
                              ? round.roundId === currRoundId &&
                                bracket.id === currBracketId
                                ? progressColor2.running
                                : progressColor2.pending
                              : progressColor2.finished,
                        }}
                      >
                        {round.trials.filter((t) => t.status === "done").length}{" "}
                        / {round.trials.length}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
            <HeaderText text="Progress Condition" />
            <div className="flex gap-2 items-center">
              <CustomSelect
                className="w-30"
                options={[
                  {
                    value: "bracket",
                    label: "Bracket",
                  },
                  {
                    value: "round",
                    label: "Round",
                  },
                ]}
                value={
                  state.eventTarget === "bracket"
                    ? { value: "bracket", label: "Bracket" }
                    : { value: "round", label: "Round" }
                }
                onChange={(e: { value: string; label: string } | null) => {
                  if (e) setState({ ...state, eventTarget: e.value });
                }}
              />
              <CustomSelect
                className="w-30"
                isDisabled={status === "finished"}
                options={
                  state.eventTarget === "bracket"
                    ? brackets.map((bracket) => ({
                        value: bracket.id.toString(),
                        label: `${numOfBrackets - bracket.id}`,
                        disabled:
                          currBracketId < bracket.id || status === "finished",
                      }))
                    : brackets.flatMap((bracket) =>
                        bracket.rounds.map((round) => ({
                          value: `${bracket.id}-${round.roundId}`,
                          label: `${numOfBrackets - bracket.id}-${
                            round.roundId + 1
                          }`,
                          disabled:
                            bracket.id > currBracketId ||
                            (bracket.id === currBracketId &&
                              round.roundId < currRoundId) ||
                            status === "finished",
                        }))
                      )
                }
                value={
                  state.eventTarget === "bracket"
                    ? {
                        value: state.bracketId,
                        label: `${numOfBrackets - parseInt(state.bracketId)}`,
                      }
                    : {
                        value: state.roundId,
                        label: `${
                          numOfBrackets - parseInt(state.roundId.split("-")[0])
                        }-${parseInt(state.roundId.split("-")[1]) + 1}`,
                      }
                }
                onChange={(e: { value: string; label: string } | null) => {
                  if (e) {
                    if (state.eventTarget === "bracket") {
                      setState({ ...state, bracketId: e.value });
                    } else {
                      setState({
                        ...state,
                        roundId: e.value,
                        bracketId: e.value.split("-")[0],
                      });
                    }
                  }
                }}
              />
              <p>ends.</p>
            </div>
          </div>
        </>
      )}

      {notiCondType === "performance" && (
        <>
          <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
            <>
              Best Metric:
              {bestTrial ? (
                <span className="font-semibold">
                  {formatting(bestTrial.metric ?? 0, "float", 2)}
                </span>
              ) : (
                <span className="text-gray-500">No trials yet</span>
              )}
            </>
          </div>
          <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
            <HeaderText text="Performance Condition" />
            <div className="flex gap-2 items-center">
              <p>{metric && metric.name}</p>

              <CustomSelect
                className="w-35"
                options={[
                  {
                    value: "improveBy",
                    label: "improve by",
                  },
                  {
                    value: "reach",
                    label: "reach",
                  },
                  {
                    value: "improve",
                    label: "improve",
                  },
                ]}
                value={
                  state.metricVerb === "improveBy"
                    ? { value: "improveBy", label: "improve by" }
                    : state.metricVerb === "reach"
                    ? { value: "reach", label: "reach" }
                    : { value: "improve", label: "improve" }
                }
                onChange={(e: { value: string; label: string } | null) => {
                  if (e) setState({ ...state, metricVerb: e.value });
                }}
              />
              {bestTrial && state.metricVerb === "improveBy" ? (
                <input
                  type="number"
                  inputMode="numeric"
                  className="input input-primary validator w-20 focus:ring-0 focus:outline-none"
                  min="0"
                  max="1"
                  required
                  step={0.01}
                  value={state.by}
                  onChange={(e) => setState({ ...state, by: e.target.value })}
                />
              ) : bestTrial && state.metricVerb === "reach" ? (
                <input
                  type="number"
                  inputMode="numeric"
                  className={`
                    input w-20 focus:ring-0 focus:outline-none ${
                      bestTrial &&
                      (bestTrial.metric ?? 0) >= +(state.metricTarget ?? 0)
                        ? "input-error"
                        : "focus:input-primary"
                    }
                    `}
                  value={+(state.metricTarget ?? 0)}
                  onChange={(e) =>
                    setState({ ...state, metricTarget: Number(e.target.value) })
                  }
                />
              ) : (
                bestTrial && (
                  <p>from {formatting(bestTrial.metric ?? 0, "float", 2)}.</p>
                )
              )}
            </div>
          </div>
          <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
            <div className="flex gap-2 items-center justify-between">
              {/* <HeaderText text="Timeout Condition" /> */}
              <HeaderText text="Recurring" />

              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={state.recurring}
                onChange={(e) =>
                  setState({ ...state, recurring: e.target.checked })
                }
              />
            </div>
            {state.recurring && (
              <p className="text-sm">
                You will be notified every time the condition is met.
              </p>
            )}
          </div>
        </>
      )}

      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <div className="flex gap-2 items-center justify-between">
          <HeaderText text="Timeout Condition" />
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={state.useTimeout}
            onChange={(e) =>
              setState({ ...state, useTimeout: e.target.checked })
            }
          />
        </div>

        {state.useTimeout && (
          <>
            <CustomSelect
              options={timeoutOptions}
              value={{
                value: state.timeoutType,
                label:
                  timeoutOptions.find(
                    (option) => option.value === state.timeoutType
                  )?.label || "Custom Timeout",
              }}
              onChange={(e: { value: string; label: string } | null) =>
                e && setState({ ...state, timeoutType: e.value })
              }
            />
            {state.timeoutType === "user" && <>time picker here</>}
          </>
        )}
      </div>

      <div className="w-full flex gap-1.5 items-between flex-col bg-white p-4">
        <HeaderText text="Preview" />
        <p className="text-sm">
          {notiCondType === "progress" ? "Progress" : "Performance"} condition
          will be created as follows:
        </p>
        <ul className="list">
          <li
            className="h-[40px] bg-white flex items-center "
            style={{
              borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
            }}
          >
            <div className="w-[80%] flex items-center justify-center uppercase font-semibold">
              Triggerring Conditions
            </div>
            <div className="w-[20%] flex items-center justify-center uppercase font-semibold">
              Active
            </div>
          </li>
          {noti && noti.timeoutCond ? (
            <li
              className="h-[100px] bg-white flex items-center"
              style={{
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div className="w-[80%] h-full flex flex-col ">
                <div className="w-full h-[50%] flex gap-4 items-center justify-start px-2 border-b border-gray-200 border-dashed">
                  {noti.eventCond && noti.eventCond.type
                    ? (() => {
                        const Icon = notiTypeIcons[noti.eventCond.type];
                        return Icon ? <Icon size={24} /> : null;
                      })()
                    : null}
                  <div className="flex flex-col justify-center items-start flex-1">
                    <p>{noti.eventCond.toString()}</p>
                    <p className="text-xs">{noti.eventCond.toContent()}</p>
                  </div>
                </div>
                <div className="w-full h-[50%] flex gap-4 items-center justify-start px-2">
                  {noti.timeoutCond && noti.timeoutCond.type
                    ? (() => {
                        const Icon = notiTypeIcons[noti.timeoutCond.type];
                        return Icon ? <Icon size={24} /> : null;
                      })()
                    : null}
                  <div className="flex flex-col justify-center items-start flex-1">
                    <p>{noti.timeoutCond.toString()}</p>
                    <p className="text-xs">{noti.timeoutCond.toContent()}</p>
                  </div>
                </div>
              </div>
              <div className="w-[20%] flex items-center justify-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                />
              </div>
            </li>
          ) : noti ? (
            <li
              className="h-[50px] bg-white flex items-center"
              style={{
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div className="w-[80%] flex gap-4 items-center justify-start px-2">
                {noti.eventCond && noti.eventCond.type
                  ? (() => {
                      const Icon = notiTypeIcons[noti.eventCond.type];
                      return Icon ? <Icon size={24} /> : null;
                    })()
                  : null}
                <div className="flex flex-col justify-center items-start flex-1">
                  <p>{noti.eventCond.toString()}</p>
                  <p className="text-xs">{noti.eventCond.toContent()}</p>
                </div>
              </div>
              <div className="w-[20%] flex items-center justify-center">
                <input
                  type="checkbox"
                  defaultChecked
                  className="toggle toggle-sm toggle-primary checked:bg-primary checked:text-base-100 checked:border-primary "
                />
              </div>
            </li>
          ) : (
            <li
              className="h-[60px] bg-white flex items-center justify-center"
              style={{
                borderBottom: "1px solid #e5e7eb", // Tailwind's gray-200
              }}
            >
              No conditions set yet.
            </li>
          )}
        </ul>
      </div>
      <BottomButton
        text={"Create " + notiCondType + " Condition"}
        onClick={
          checkConditionComplete()
            ? create
            : () => handleNavigate("/main/notification")
        }
        disabled={!checkConditionComplete()}
      />
    </div>
  );
};
export default NewNotiCond;
