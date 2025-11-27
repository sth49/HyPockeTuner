// TrialTable.tsx
import React from "react";
import { flexRender, Table } from "@tanstack/react-table";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa6";
import ExpandedRow from "./ExpandedRow";
import { TrialRowType } from "../../types/table";
interface Props {
  table: Table<TrialRowType>;
  handleRowClick: (trialId: string) => void;
}
const TrialTable: React.FC<Props> = ({ table, handleRowClick }) => {
  return (
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
        {table.getRowModel().rows.map((row) => {
          return (
            <>
              <tr
                key={row.id}
                onClick={() => handleRowClick(row.original.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      className="border-b border-gray-200 text-[0.8rem] border-r text-center h-[30px]"
                      width={cell.column.getSize()}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
              <ExpandedRow row={row} />
            </>
          );
        })}
      </tbody>
    </table>
  );
};

export default TrialTable;
