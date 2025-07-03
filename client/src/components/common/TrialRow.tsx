// TrialRow.tsx
import React from "react";
import { flexRender, Row } from "@tanstack/react-table";
import { TrialRowType } from "../../types/table";
// import { TrialRow as TrialRowType } from "./types";

interface Props {
  row: Row<TrialRowType>;
  onClick: (rowId: string) => void;
}

const TrialRow: React.FC<Props> = ({ row, onClick }) => {
  return (
    <tr
      key={row.id}
      onClick={() => onClick(row.id)}
      className="cursor-pointer hover:bg-gray-50"
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="border-b border-gray-200 text-[0.8rem] border-r text-center h-[30px]"
          width={cell.column.getSize()}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

export default TrialRow;
