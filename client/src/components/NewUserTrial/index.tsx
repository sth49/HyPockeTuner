import { useParams } from "react-router";
import BottomButton from "../common/BottomButton";
import HeaderText from "../common/HeaderText";
import { flexRender } from "@tanstack/react-table";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa6";
import { useExperimentStore } from "../../stores/experimentStore";
import { hpTypeIcons } from "../../utils/icon";

import * as uuid from "uuid";
import {
  HyperparamTypes,
  OrderedHyperparam,
  UniformHyperparam,
  UnorderedHyperparam,
} from "../../types";
import { CustomSelect } from "../CustomSelect";
import { NotiCondPair, TrialFinishCond } from "../../models/notification";
import ApiClient from "../../api/api";
import { useNavigation } from "../../hooks/useNavigation";
import { useTrialData } from "../../hooks/useTrialData";
import { IoLogoUsd } from "react-icons/io5";
const NewUserTrial = () => {
  const { id } = useParams<{ id: string }>();
  const { table } = useTrialData(false, false); // Get the table without selection or expansion

  const { handleNavigate } = useNavigation();
  const expId = useExperimentStore((state) => state.expId);

  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const hparamList = hyperparams
    ? hyperparams.filter((hp) => !hp.getIsConstant()).map((hp) => hp.name)
    : [];

  // const hparamList = hyperparams

  // 고정된 trial ID를 저장 (테이블 row id가 아닌 실제 trial id)
  const [pinnedTrialId, setPinnedTrialId] = useState<string | null>(null);

  // rowPinning state는 제거하고 pinnedTrialId만 사용

  const [userHparamValues, setUserHparamValues] = useState<
    Record<string, string | number>
  >({});

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const pendingRowRef = useRef<any>(null);

  // 값 검증 로직
  const isValidConfiguration = useMemo(() => {
    if (!hyperparams) return false;

    // 1. 모든 하이퍼파라미터가 유효한 값을 가져야 함
    for (const hparam of hyperparams) {
      const value = userHparamValues[hparam.name];

      // 값이 없거나 빈 문자열인 경우
      if (value === undefined || value === null || value === "") {
        return false;
      }

      // UniformHyperparam 타입 검증
      if (hparam instanceof UniformHyperparam) {
        const numValue = Number(value);
        if (
          isNaN(numValue) ||
          numValue < hparam.range[0] ||
          numValue > hparam.range[1]
        ) {
          return false;
        }
      }

      // OrderedHyperparam과 UnorderedHyperparam 타입 검증
      if (
        hparam instanceof OrderedHyperparam ||
        hparam instanceof UnorderedHyperparam
      ) {
        const stringValue = String(value);
        const validValues = hparam.values.map((v) =>
          v === true ? "True" : v === false ? "False" : String(v)
        );
        if (!validValues.includes(stringValue)) {
          return false;
        }
      }
    }

    // 2. Budget 값 검증
    const budgetValue = Number(userHparamValues["budget"]);
    if (isNaN(budgetValue) || budgetValue <= 0) {
      return false;
    }

    return true;
  }, [hyperparams, userHparamValues]);

  const initializePinnedTrial = useCallback(() => {
    if (!id || !table) return;

    const rows = table.getRowModel().rows;

    if (rows.length === 0) {
      console.log("No rows available yet, skipping initialization");
      return;
    }

    // 처음에만 pinnedTrialId 설정
    if (!pinnedTrialId) {
      const pinnedRow = rows.find((row) => row.original.id === id);
      console.log("Setting initial pinned trial ID:", pinnedRow?.original.id);

      if (pinnedRow) {
        setPinnedTrialId(pinnedRow.original.id);

        const newParamValues: Record<string, string | number> = {};
        hyperparams?.forEach((h) => {
          if (
            h instanceof OrderedHyperparam ||
            h instanceof UnorderedHyperparam
          ) {
            newParamValues[h.name] = pinnedRow.original[h.name];
          } else if (h instanceof UniformHyperparam) {
            newParamValues[h.name] = Number(
              pinnedRow.original[h.name] || h.range[0]
            );
          }
        });
        newParamValues["budget"] = pinnedRow.original.budget || 1;
        console.log("Setting user hyperparameter values:", newParamValues);
        setUserHparamValues(newParamValues);
      }
    }
  }, [hyperparams, id, table, pinnedTrialId]);

  // userTrials 변경시에도 pinning 재적용

  // 초기 설정용 - 한 번만 실행
  useEffect(() => {
    if (table && id && !pinnedTrialId) {
      const checkAndInitialize = () => {
        const rows = table.getRowModel().rows;
        if (rows.length > 0) {
          initializePinnedTrial();
        } else {
          setTimeout(checkAndInitialize, 100);
        }
      };

      checkAndInitialize();
    }
  }, [id, table, initializePinnedTrial, pinnedTrialId]);

  // pinnedTrialId를 사용하여 고정된 row와 일반 rows를 분리
  const allRows = table.getRowModel().rows;
  const pinnedRow = pinnedTrialId
    ? allRows.find((row) => row.original.id === pinnedTrialId)
    : null;
  const regularRows = allRows.filter(
    (row) => row.original.id !== pinnedTrialId
  );

  useEffect(() => {
    if (hyperparams) {
      const initialValues: Record<string, string | number> = {};
      hyperparams.forEach((h) => {
        if (
          h instanceof OrderedHyperparam ||
          h instanceof UnorderedHyperparam
        ) {
          initialValues[h.name] =
            typeof h.values[0] === "boolean"
              ? h.values[0] === true
                ? "True"
                : "False"
              : h.values[0];
        } else if (h instanceof UniformHyperparam) {
          // initialValues[h.name] = h.range[0]; // 초기값 설정하지 않음
        }
      });
      initialValues["budget"] = 1; // Default budget value (minimum 1)
      setUserHparamValues(initialValues);
    }
  }, [hyperparams]);

  const renderRow = (row: any, isPinned = false) => (
    <tr
      key={row.id}
      className={`cursor-pointer hover:bg-gray-50 ${
        isPinned ? "bg-gray-100" : ""
      }`}
      style={
        isPinned
          ? {
              position: "sticky",
              top: "35px",
              zIndex: 5,
              boxShadow: "0 0.5px 0 0 oklch(92.8% 0.006 264.531)",
              fontWeight: "bold",
            }
          : {}
      }
      onClick={() => {
        console.log("Row clicked:", row.original.id);
        if (isPinned) {
          // Unpin the current row
          console.log("Unpinning row:", row.original.id);
          setPinnedTrialId(null);
        } else {
          // Store the pending row and show confirmation dialog
          pendingRowRef.current = row;
          setShowConfirmDialog(true);
        }
      }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <td
          key={cell.id}
          className={`border-b text-[0.8rem] border-r text-center h-[30px] border-gray-200`}
          width={cell.column.getSize()}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );

  const handleConfirmSelection = () => {
    const row = pendingRowRef.current;
    if (!row) return;

    console.log("Pinning trial:", row.original.id);

    // Set pinnedTrialId instead of using rowPinning
    setPinnedTrialId(row.original.id);

    const newUserHparamValues: Record<string, string | number> = {};
    hyperparams?.forEach((h) => {
      if (h instanceof OrderedHyperparam || h instanceof UnorderedHyperparam) {
        newUserHparamValues[h.name] = row.original[h.name];
      } else if (h instanceof UniformHyperparam) {
        newUserHparamValues[h.name] = Number(
          row.original[h.name] || h.range[0]
        );
      }
    });
    console.log("Setting user hyperparameter values:", newUserHparamValues);
    newUserHparamValues["budget"] = row.original.budget || 1; // Set budget
    setUserHparamValues(newUserHparamValues); // Update local state

    // Close dialog and clear pending row
    setShowConfirmDialog(false);
    pendingRowRef.current = null;
  };

  const handleCreateNewTrial = () => {
    console.log("Creating new trial with hyperparameters:", userHparamValues);
    const id = uuid.v4(); // Generate a new unique ID for the trial
    const hparam: any[] = [];
    hyperparams?.forEach((h) => {
      const trial = h.toUserTrial(
        userHparamValues[h.name] === "True"
          ? true
          : userHparamValues[h.name] === "False"
          ? false
          : userHparamValues[h.name]
      );
      if (trial) {
        hparam.push(trial);
      }
    });
    const eventCond = new TrialFinishCond(id);
    const newNotiCondPair = new NotiCondPair(eventCond, null);
    // setNotiCondPairs([newNotiCondPair, ...notiCondPairs]);
    ApiClient.addCondition(newNotiCondPair);
    const data = {
      id: id,
      iter: Number(userHparamValues["budget"]) || 0,
      config: hparam,
      exp_id: expId,
    };
    ApiClient.postTrial(data);

    console.log("Hyperparameters to send:", hparam);
    handleNavigate("/main/trials");

    // Here you would typically send the userHparamValues to your backend
  };

  return (
    <>
      <div className="flex flex-col bg-white m-2">
        <div className="flex justify-between items-center p-4 ">
          <HeaderText text="From History" />
          <span className="badge badge-outline badge-primary text-sm">
            {pinnedTrialId ? pinnedTrialId.slice(0, 3) : "None"}
          </span>
        </div>

        <div className="w-full h-[250px] overflow-auto">
          <table className="w-full border-collapse border-gray-200">
            <thead
              className="bg-white border-b sticky top-0 z-10"
              style={{ boxShadow: "0 0.5px 0 0 oklch(92.8% 0.006 264.531)" }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className="text-sm uppercase h-[35px]"
                        style={{
                          width: header.column.getSize(),
                          minWidth: header.column.getSize(),
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center justify-center h-full cursor-pointer select-none"
                          >
                            {header.column.getCanSort() &&
                              header.column.getIsSorted() !== false && (
                                <span className="mr-0.5">
                                  {header.column.getIsSorted() === "asc" ? (
                                    <FaSortUp />
                                  ) : header.column.getIsSorted() === "desc" ? (
                                    <FaSortDown />
                                  ) : (
                                    <FaSort />
                                  )}
                                </span>
                              )}
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {pinnedRow && renderRow(pinnedRow, true)}
              {regularRows.map((row) => renderRow(row, false))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col bg-white m-2 flex-1 p-4">
        {hyperparams?.map((h) => {
          // const Icon =
          //   hpTypeIcons[HyperparamTypes[h.type].toLowerCase()] ||
          //   (() => <span>?</span>);
          const Icon =
            h && hparamList.includes(h.name)
              ? hpTypeIcons[HyperparamTypes[h.type].toLowerCase()] || null
              : hpTypeIcons.constant;

          return (
            <div
              key={h.name}
              className="flex justify-between items-center border-b border-gray-200 p-2"
            >
              <span className="text-sm  flex items-center gap-1">
                <Icon />
                {h.name}
              </span>
              {h instanceof OrderedHyperparam ||
              h instanceof UnorderedHyperparam ? (
                <CustomSelect
                  options={
                    h instanceof OrderedHyperparam
                      ? h.values.map((value) => ({
                          value: value,
                          label: value,
                        }))
                      : h instanceof UnorderedHyperparam
                      ? h.values.map((choice) => ({
                          value:
                            choice === true
                              ? "True"
                              : choice === false
                              ? "False"
                              : choice,
                          label:
                            choice === true
                              ? "True"
                              : choice === false
                              ? "False"
                              : choice,
                        }))
                      : []
                  }
                  className="w-[50%] text-sm"
                  onChange={(value: { value: any }) => {
                    // console.log("Selected value:", value);
                    if (value) {
                      setUserHparamValues((prev) => ({
                        ...prev,
                        [h.name]: value.value,
                      }));
                    } else {
                      setUserHparamValues((prev) => ({
                        ...prev,
                        [h.name]: "",
                      }));
                    }
                  }}
                  value={
                    h instanceof OrderedHyperparam ||
                    h instanceof UnorderedHyperparam
                      ? {
                          value: userHparamValues[h.name],
                          label: userHparamValues[h.name],
                        }
                      : null
                  }
                />
              ) : (
                <input
                  type="number"
                  placeholder={
                    h instanceof UniformHyperparam
                      ? `${h.range[0]} - ${h.range[1]}`
                      : "Type here"
                  }
                  value={
                    userHparamValues[h.name] !== undefined &&
                    userHparamValues[h.name] !== ""
                      ? userHparamValues[h.name]
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    setUserHparamValues((prev) => ({
                      ...prev,
                      [h.name]: value ? Number(value) : "",
                    }));
                  }}
                  className={`input focus:ring-0 focus:outline-none w-[50%] bg-white ${(() => {
                    const value = userHparamValues[h.name];
                    if (value === "" || value === undefined || value === null) {
                      return "border-error focus:border-error";
                    }
                    if (h instanceof UniformHyperparam) {
                      const numValue = Number(value);
                      if (
                        isNaN(numValue) ||
                        numValue < h.range[0] ||
                        numValue > h.range[1]
                      ) {
                        return "border-error focus:border-error";
                      }
                    }
                    return "focus:border-primary border-gray-300";
                  })()}`}
                />
              )}
            </div>
          );
        })}
        <div className="flex justify-between items-center border-b border-gray-200 p-2">
          <span className="text-sm  flex items-center gap-1">
            <IoLogoUsd />
            Budget
          </span>

          <input
            type="number"
            min="1"
            // placeholder="Type here"
            value={Number(userHparamValues["budget"]) || ""}
            onChange={(e) => {
              const value = e.target.value;
              setUserHparamValues((prev) => ({
                ...prev,
                budget: value ? Number(value) : "",
              }));
            }}
            className={`input focus:ring-0 focus:outline-none w-[50%] bg-white ${(() => {
              const value = userHparamValues["budget"];
              const numValue = Number(value);
              if (
                value === "" ||
                value === undefined ||
                value === null ||
                isNaN(numValue) ||
                numValue <= 0
              ) {
                return "border-error focus:border-error";
              }
              return "focus:border-primary border-gray-300";
            })()}`}
          />
        </div>
      </div>

      <BottomButton
        onClick={handleCreateNewTrial}
        text="Create New Trial"
        disabled={!isValidConfiguration}
      />

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <>
          {/* Background overlay with opacity */}
          <div
            className="fixed inset-0 bg-black opacity-30 z-40 "
            onClick={() => {
              setShowConfirmDialog(false);
              pendingRowRef.current = null;
            }}
          />

          {/* Dialog container */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                Change the configuration?
              </h3>
              <p className="text-gray-600 mb-6">
                Do you want to use this Trial{" "}
                {pendingRowRef.current?.original.event || "N/A"}'s configuration
                as a starting point?
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    pendingRowRef.current = null;
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmSelection}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default NewUserTrial;
