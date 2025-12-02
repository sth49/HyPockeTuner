import { useEffect, useMemo, useState, useRef } from "react";
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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "metric", desc: true }, // Default sort by metric (Accuracy) in descending order
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const { getMetricColor, getFontColor, getLossColor } = useColorScale();

  // Use ref to persist expanded state across renders
  const expandedRef = useRef<Record<string, boolean>>({});
  const rowSelectionRef = useRef<Record<string, boolean>>({});

  // Update ref whenever expanded state changes
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Update ref whenever selection state changes
  useEffect(() => {
    rowSelectionRef.current = rowSelection;
  }, [rowSelection]);

  useEffect(() => {
    if (brackets.length === 0 && (!userTrials || userTrials.length === 0)) {
      console.log("No data available, keeping loading state");
      setIsLoading(true);
      setData([]);
      return;
    }

    setIsLoading(false);

    const rows: TrialRowType[] = [];
    const numOfBrackets = brackets.length;

    brackets.forEach((bracket) => {
      bracket.rounds.forEach((round) => {
        round.trials.forEach((trial) => {
          if (trial.status !== "done") {
            return; // Only include completed trials
          }
          if (!trial.id) {
            return;
          }
          const params = hyperparams?.reduce((acc, h) => {
            acc[h.name] = h.formatting(trial.params?.[h.name]);
            return acc;
          }, {} as Record<string, any>);

          rows.push({
            id: trial.id,
            event: `${numOfBrackets - bracket.id}-${round.roundId + 1}-${
              trial.trialId + 1
            }`,
            loss: formatting(trial.loss ?? 0, "float", 3),
            metric: formatting(trial.metric ?? 0, "float"),
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
        if (trial.status !== "done") {
          return; // Only include completed trials
        }
        const params = hyperparams?.reduce((acc, h) => {
          acc[h.name] = h.formatting(trial.params?.[h.name]);
          //   h.type === HyperparamTypes.Uniform
          //     ? trial.params?.[h.name] ?? 0
          //     : trial.params?.[h.name] === true
          //     ? "True"
          //     : trial.params?.[h.name] === false
          //     ? "False"
          //     : trial.params?.[h.name] ?? 0;
          // return acc;
          return acc;
        }, {} as Record<string, any>);
        rows.push({
          id: trial.id ?? "USER",
          event: "USER",
          loss: formatting(trial.loss ?? 0, "float", 3),
          metric: formatting(trial.metric ?? 0, "float"),
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

    setData(rows);

    // Preserve expanded state for existing trials using ref
    const expandedTrialIds = Object.keys(expandedRef.current);
    if (expandedTrialIds.length > 0) {
      const newExpanded: Record<string, boolean> = {};
      expandedTrialIds.forEach((trialId) => {
        // Check if the trial still exists in the new data (with safety check)
        if (rows.some((row) => row.original && row.original.id === trialId)) {
          newExpanded[trialId] = true;
        }
      });
      // Only update if there are expanded trials to preserve
      if (Object.keys(newExpanded).length > 0) {
        setExpanded(newExpanded);
      }
    }

    // Preserve selection state for existing trials using ref (trial ID based)
    const selectedTrialIds = Object.keys(rowSelectionRef.current);
    if (selectedTrialIds.length > 0) {
      const newSelection: Record<string, boolean> = {};
      selectedTrialIds.forEach((trialId) => {
        // Check if the trial still exists in the new data (with safety check)
        if (rows.some(row => row.original && row.original.id === trialId)) {
          newSelection[trialId] = true;
        }
      });
      // Only update if there are selected trials to preserve
      if (Object.keys(newSelection).length > 0) {
        setRowSelection(newSelection);
      }
    }
  }, [brackets, hyperparams, userTrials]);
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

  // Convert trial ID based expanded state to row ID based state for TanStack Table
  const tableExpandedState = useMemo(() => {
    if (!isExpand) return {};
    const rowBasedExpanded: Record<string, boolean> = {};
    
    Object.keys(expanded).forEach((trialId) => {
      // Find the row index for this trial ID
      const rowIndex = data.findIndex(row => row && row.id === trialId);
      if (rowIndex !== -1 && (expanded as Record<string, boolean>)[trialId]) {
        rowBasedExpanded[rowIndex.toString()] = true;
      }
    });
    
    return rowBasedExpanded;
  }, [expanded, data, isExpand]);

  // Convert trial ID based selection state to row ID based state for TanStack Table
  const tableSelectionState = useMemo(() => {
    if (!isCheck) return {};
    const rowBasedSelection: Record<string, boolean> = {};
    
    Object.keys(rowSelection).forEach((trialId) => {
      // Find the row index for this trial ID
      const rowIndex = data.findIndex(row => row && row.id === trialId);
      if (rowIndex !== -1 && rowSelection[trialId]) {
        rowBasedSelection[rowIndex.toString()] = true;
      }
    });
    
    return rowBasedSelection;
  }, [rowSelection, data, isCheck]);

  const table = useReactTable<TrialRowType>({
    data: data,
    columns: column,
    state: {
      expanded: tableExpandedState,
      rowSelection: tableSelectionState,
      sorting,
    },
    onExpandedChange: isExpand ? (updater) => {
      // Convert row-based expanded state back to trial ID based
      const newRowBasedState = typeof updater === 'function' ? updater(tableExpandedState) : updater;
      const newTrialBasedState: Record<string, boolean> = {};
      
      Object.keys(newRowBasedState || {}).forEach((rowIndex) => {
        const trial = data[parseInt(rowIndex)];
        if (trial && newRowBasedState && (newRowBasedState as Record<string, boolean>)[rowIndex]) {
          newTrialBasedState[trial.id] = true;
        }
      });
      
      setExpanded(newTrialBasedState);
    } : undefined,
    onSortingChange: setSorting,
    onRowSelectionChange: isCheck ? (updater) => {
      // Convert row-based selection state back to trial ID based
      const newRowBasedState = typeof updater === 'function' ? updater(tableSelectionState) : updater;
      const newTrialBasedState: Record<string, boolean> = {};
      
      Object.keys(newRowBasedState || {}).forEach((rowIndex) => {
        const trial = data[parseInt(rowIndex)];
        if (trial && newRowBasedState && (newRowBasedState as Record<string, boolean>)[rowIndex]) {
          newTrialBasedState[trial.id] = true;
        }
      });
      
      setRowSelection(newTrialBasedState);
    } : undefined,

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
