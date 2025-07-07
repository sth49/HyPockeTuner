import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import { columns as baseColumns } from "../types/columns";
import { useColorScale } from "../utils/colorScale";
import { HyperparamTypes } from "../types";
import { formatting } from "../utils/formatting";
import { useExperimentStore } from "../stores/experimentStore";
import { TrialRowType } from "../types";

export const useTrialData = (isExpand: boolean, isCheck: boolean) => {
  const brackets = useExperimentStore((state) => state.brackets);
  const hyperparams = useExperimentStore((state) => state.hyperparams);
  const userTrials = useExperimentStore((state) => state.userTrials);

  const [data, setData] = useState<TrialRowType[]>([]);
  const [expanded, setExpanded] = useState({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getMetricColor, getFontColor, getLossColor } = useColorScale();

  useEffect(() => {
    console.log("=== useTrialData Debug ===");
    console.log("Brackets:", brackets);
    console.log("Hyperparams:", hyperparams);
    console.log("UserTrials:", userTrials);

    // 데이터가 없으면 로딩 상태 유지
    if (brackets.length === 0 && (!userTrials || userTrials.length === 0)) {
      console.log("No data available, keeping loading state");
      setIsLoading(true);
      setData([]);
      return;
    }

    // 데이터 처리 시작
    setIsLoading(false);

    const rows: TrialRowType[] = [];
    const numOfBrackets = brackets.length;

    brackets.forEach((bracket) => {
      bracket.rounds.forEach((round) => {
        round.trials.forEach((trial) => {
          if (!trial.id) {
            return;
          }
          const params = hyperparams?.reduce((acc, h) => {
            acc[h.name] =
              h.type === HyperparamTypes.Uniform
                ? formatting(trial.params?.[h.name] ?? 0, "float", 3)
                : trial.params?.[h.name] === true
                ? "True"
                : trial.params?.[h.name] === false
                ? "False"
                : trial.params?.[h.name] ?? 0;
            return acc;
          }, {} as Record<string, any>);

          rows.push({
            id: trial.id,
            event: `${numOfBrackets - bracket.id}-${round.roundId + 1}-${
              trial.trialId + 1
            }`,
            loss: formatting(trial.loss ?? 0, "float", 3),
            metric: formatting(trial.metric ?? 0, "float", 2),
            budget: trial.budget ?? 0,
            start:
              (trial.startTime ?? 0) !== 0 ? trial.startTime ?? 0 : Date.now(),
            end: (trial.endTime ?? 0) !== 0 ? trial.endTime ?? 0 : Date.now(),
            ...params,
          });
        });
      });
    });

    if (userTrials) {
      userTrials.forEach((trial) => {
        const params = hyperparams?.reduce((acc, h) => {
          acc[h.name] =
            h.type === HyperparamTypes.Uniform
              ? formatting(trial.params?.[h.name] ?? 0, "float", 3)
              : trial.params?.[h.name] === true
              ? "True"
              : trial.params?.[h.name] === false
              ? "False"
              : trial.params?.[h.name] ?? 0;
          return acc;
        }, {} as Record<string, any>);
        rows.push({
          id: trial.id ?? "USER",
          event: "USER",
          loss: formatting(trial.loss ?? 0, "float", 3),
          metric: formatting(trial.metric ?? 0, "float", 2),
          budget: trial.budget ?? 0,
          start:
            (trial.startTime ?? 0) !== 0 ? trial.startTime ?? 0 : Date.now(),
          end: (trial.endTime ?? 0) !== 0 ? trial.endTime ?? 0 : Date.now(),
          ...params,
        });
      });
    }

    rows.sort((a, b) => {
      return (b.start ?? 0) - (a.start ?? 0);
    });

    console.log("Processed rows:", rows.length);
    setData(rows);
  }, [brackets, hyperparams, userTrials]); // table 제거
  const metric = useExperimentStore((state) => state.metric);
  const column = useMemo(
    () =>
      baseColumns(
        hyperparams ?? [],
        {
          getMetricColor,
          getFontColor,
          getLossColor,
        },
        isCheck,
        metric?.name ?? "metric"
      ),
    [
      getFontColor,
      getLossColor,
      getMetricColor,
      hyperparams,
      isCheck,
      metric?.name,
    ]
  );

  const table = useReactTable<TrialRowType>({
    data: data,
    columns: column,
    state: {
      expanded: isExpand ? expanded : {},
      rowSelection: isCheck ? rowSelection : {},
      sorting,
    },
    onExpandedChange: isExpand ? setExpanded : undefined,
    onSortingChange: setSorting,
    onRowSelectionChange: isCheck ? setRowSelection : undefined,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return {
    data,
    isLoading,
    sorting,
    setSorting,
    expanded,
    setExpanded,
    rowSelection,
    setRowSelection,
    table,
  };
};
