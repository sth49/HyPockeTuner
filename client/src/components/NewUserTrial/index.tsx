import { useParams } from "react-router";
import BottomButton from "../common/BottomButton";
import HeaderText from "../common/HeaderText";
import { flexRender, RowPinningState } from "@tanstack/react-table";
import { useState, useEffect, useCallback } from "react";
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
const NewUserTrial = () => {
  const { id } = useParams<{ id: string }>();
  const { table } = useTrialData(false, false); // Get the table without selection or expansion

  const { handleNavigate } = useNavigation();
  const expId = useExperimentStore((state) => state.expId);

  const hyperparams = useExperimentStore((state) => state.hyperparams);

  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    top: [],
  });

  const [userHparamValues, setUserHparamValues] = useState<
    Record<string, string | number>
  >({});

  const applyRowPinning = useCallback(() => {
    if (!id || !table) return;

    const rows = table.getRowModel().rows;

    if (rows.length === 0) {
      console.log("No rows available yet, skipping pinning");
      return;
    }

    const pinnedRow = rows.find((row) => row.original.id === id);
    console.log("Found pinned row:", pinnedRow?.id);

    if (pinnedRow) {
      const newPinning = {
        top: [pinnedRow.id],
        bottom: [],
      };
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
      newParamValues["budget"] = pinnedRow.original.budget || 0;
      console.log("Setting user hyperparameter values:", newParamValues);
      setUserHparamValues(newParamValues);

      console.log("Setting pinning:", newPinning);
      setRowPinning(newPinning);
      table.setRowPinning(newPinning);
    }
  }, [hyperparams, id, table]);

  useEffect(() => {
    if (table && id) {
      const checkAndApplyPinning = () => {
        const rows = table.getRowModel().rows;
        if (rows.length > 0) {
          applyRowPinning();
        } else {
          setTimeout(checkAndApplyPinning, 100);
        }
      };

      checkAndApplyPinning();
    }
  }, [id, table, applyRowPinning]);

  const topPinnedRows = table.getTopRows();
  const regularRows = table.getRowModel().rows;

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
          initialValues[h.name] = h.range[0];
        }
      });
      initialValues["budget"] = 0; // Default budget value
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
        console.log("Row clicked:", row.id);
        const newTop = rowPinning.top?.[0] === row.id ? [] : [row.id];
        if (isPinned) {
          console.log("Unpinning row:", row.id, isPinned, newTop);
          const newPinning = {
            top: [],
          };
          setRowPinning(newPinning); // React local state
          table.setRowPinning(newPinning); // Table state
        } else {
          console.log("Pinning row:", row.id);
          const newPinning = {
            top: newTop,
          };
          const newUserHparamValues: Record<string, string | number> = {};
          hyperparams?.forEach((h) => {
            if (
              h instanceof OrderedHyperparam ||
              h instanceof UnorderedHyperparam
            ) {
              newUserHparamValues[h.name] = row.original[h.name];
            } else if (h instanceof UniformHyperparam) {
              newUserHparamValues[h.name] = Number(
                row.original[h.name] || h.range[0]
              );
            }
          });
          console.log(
            "Setting user hyperparameter values:",
            newUserHparamValues
          );
          newUserHparamValues["budget"] = row.original.budget || 0; // Set budget
          setUserHparamValues(newUserHparamValues); // Update local state
          console.log("New pinning state:", newPinning);
          setRowPinning(newPinning); // React local state
          table.setRowPinning(newPinning); // Table state
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
            {regularRows
              .find((row) => row.id === (rowPinning.top?.[0] ?? ""))
              ?.original.id.slice(0, 3) || "None"}
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
              {topPinnedRows.map((row) => renderRow(row, true))}
              {regularRows.map((row) => renderRow(row, false))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-col bg-white m-2 flex-1 p-4">
        {hyperparams?.map((h) => {
          const Icon =
            hpTypeIcons[HyperparamTypes[h.type].toLowerCase()] ||
            (() => <span>?</span>);
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
                  // placeholder="Type here"
                  value={Number(userHparamValues[h.name])}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUserHparamValues((prev) => ({
                      ...prev,
                      [h.name]: value ? Number(value) : "",
                    }));
                  }}
                  className="input focus:ring-0 focus:outline-none focus:border-primary w-[50%] bg-white"
                />
              )}
            </div>
          );
        })}
        <div className="flex justify-between items-center border-b border-gray-200 p-2">
          <span className="text-sm  flex items-center gap-1">
            {/* <Icon /> */}
            Budget
          </span>

          <input
            type="number"
            // placeholder="Type here"
            value={Number(userHparamValues["budget"])}
            onChange={(e) => {
              const value = e.target.value;
              setUserHparamValues((prev) => ({
                ...prev,
                budget: value ? Number(value) : "",
              }));
            }}
            className="input focus:ring-0 focus:outline-none focus:border-primary w-[50%] bg-white "
          />
        </div>
      </div>

      <BottomButton onClick={handleCreateNewTrial} text="Create New Trial" />
    </>
  );
};

export default NewUserTrial;
