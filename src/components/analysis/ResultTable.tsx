import type { ReactNode } from "react";

export interface TableColumn {
  key: string;
  header: string;
}

export function ResultTable({
  columns,
  rows,
  emptyMessage = "No results yet.",
}: {
  columns: TableColumn[];
  rows: Record<string, ReactNode>[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[1px] text-muted">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium whitespace-nowrap">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-line/60 hover:bg-raised/50">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 font-mono whitespace-nowrap">
                    {row[column.key] ?? "N/A"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
