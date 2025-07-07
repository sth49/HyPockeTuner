// 📄 columns.ts
import { Hyperparam } from "./hyperparameter";
import { formatting } from "../utils/formatting";
import { ColumnDef } from "@tanstack/react-table";
import { TrialRowType } from "./table";
import CheckBox from "../components/common/CheckBox";

type ColorScaleFns = {
  getMetricColor: (value: number) => string;
  getFontColor: (value: number, type?: "metric" | "loss") => string;
  getLossColor: (value: number) => string;
};

export const columns = (
  hyperparams: Hyperparam[],
  colorScaleFns: ColorScaleFns,
  isCheckboxEnabled: boolean = true,
  metricName: string = "metric"
): ColumnDef<TrialRowType>[] => {
  const { getMetricColor, getFontColor, getLossColor } = colorScaleFns;
  const hyperparamCols =
    hyperparams
      ?.filter((h) => h.selected)
      .map((h) => ({
        accessorKey: h.name,
        header: h.displayName,
        cell: (info: { getValue: () => any }) => {
          return info.getValue();
        },
        size: 60,
      })) ?? [];

  return [
    ...(isCheckboxEnabled
      ? [
          {
            id: "selection",
            header: "",
            cell: ({ row }: { row: any }) => (
              <CheckBox
                label={""}
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                disabled={false}
              />
            ),
            size: 40,
          },
        ]
      : []),
    {
      accessorKey: "id",
      header: "ID",
      cell: (info) => (info.getValue() as string).slice(0, 3),
      size: 50,
      enableSorting: false,
    },
    {
      accessorKey: "event",
      header: "Event",
      cell: (info) => info.getValue(),
      size: 60,
    },
    {
      accessorKey: "loss",
      header: "Loss",
      cell: (info) => (
        <div
          className="h-full flex items-center justify-center font-light"
          style={{
            backgroundColor: getLossColor(info.getValue() as number),
            color: getFontColor(info.getValue() as number, "loss"),
          }}
        >
          {formatting(info.getValue() as number, "float", 3)}
        </div>
      ),
      size: 56,
    },
    {
      accessorKey: "metric",
      header: metricName.slice(0, 4).toUpperCase(),
      cell: (info) => (
        <div
          className="h-full flex items-center justify-center font-light"
          style={{
            backgroundColor: getMetricColor(info.getValue() as number),
            color: getFontColor(info.getValue() as number),
          }}
        >
          {formatting(info.getValue() as number, "float", 2)}
        </div>
      ),
      size: 56,
    },
    {
      accessorKey: "budget",
      header: "BG",
      cell: (info) => info.getValue(),
      size: 40,
    },
    ...hyperparamCols,
  ];
};
