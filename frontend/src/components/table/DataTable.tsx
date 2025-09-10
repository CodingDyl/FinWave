import React, { useMemo, useState } from "react";
import Skeleton from "../ui/Skeleton";

export type Column<T> = {
  header: string;
  accessor?: keyof T & string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;

  // sorting
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
};

type PaginationOpts = {
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  empty?: React.ReactNode;
  pagination?: PaginationOpts;

  // new
  loading?: boolean;
  skeletonRows?: number;
};

type SortState = { index: number; dir: "asc" | "desc" } | null;

export default function DataTable<T>({
  columns,
  data,
  empty,
  pagination,
  loading = false,
  skeletonRows = 8,
}: Props<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 25, 50];
  const [pageSize, setPageSize] = useState(pagination?.initialPageSize ?? pageSizeOptions[0]);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns[sort.index];
    if (!col) return data;
    const getter =
      col.sortAccessor ??
      (col.accessor
        ? (row: T) => (row as any)[col.accessor as string]
        : undefined);
    if (!getter) return data;

    const arr = [...data];
    arr.sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      const A = va instanceof Date ? va.getTime() : (va as any);
      const B = vb instanceof Date ? vb.getTime() : (vb as any);
      if (A == null && B == null) return 0;
      if (A == null) return sort.dir === "asc" ? -1 : 1;
      if (B == null) return sort.dir === "asc" ? 1 : -1;
      if (A < B) return sort.dir === "asc" ? -1 : 1;
      if (A > B) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const curPage = Math.min(page, pageCount - 1);
  const start = curPage * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = sorted.slice(start, end);

  const onHeaderClick = (idx: number, c: Column<T>) => {
    if (!c.sortable) return;
    setPage(0);
    setSort((s) => {
      if (!s || s.index !== idx) return { index: idx, dir: "asc" };
      if (s.dir === "asc") return { index: idx, dir: "desc" };
      return null; // third click clears sort
    });
  };

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            {columns.map((c, i) => {
              const isSorted = sort?.index === i;
              const arrow =
                isSorted ? (sort?.dir === "asc" ? "▲" : "▼") : c.sortable ? "⇅" : null;

              return (
                <th
                  key={i}
                  onClick={() => onHeaderClick(i, c)}
                  className={[
                    "px-4 py-3 font-medium text-xs border-b select-none",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    c.sortable ? "cursor-pointer hover:text-foreground" : "",
                    c.className || "",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {arrow && <span className="opacity-70">{arrow}</span>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`s-${i}`} className="last:border-0">
                {columns.map((c, j) => (
                  <td key={j} className={["px-4 py-3 border-b", c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"].join(" ")}>
                    <Skeleton className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))
          ) : pageRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                {empty ?? "No data"}
              </td>
            </tr>
          ) : (
            pageRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-accent/50">
                {columns.map((c, cIdx) => {
                  const content = c.render ? c.render(row) : (row as any)[c.accessor as string];
                  return (
                    <td
                      key={cIdx}
                      className={[
                        "px-4 py-3 border-b align-middle",
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                      ].join(" ")}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* footer */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {loading ? "Loading…" : total === 0 ? "0" : `${start + 1}–${end}`} of {loading ? "—" : total}
        </div>
        <div className="flex items-center gap-2">
          <label className="label text-xs">Rows</label>
          <select
            className="select h-8"
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              setPage(0);
            }}
            disabled={loading}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost h-8 px-2" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || curPage === 0}>‹</button>
            <div className="text-xs min-w-[3ch] text-center">
              {loading ? "—" : pageCount === 0 ? 0 : curPage + 1}/{loading ? "—" : pageCount}
            </div>
            <button className="btn btn-ghost h-8 px-2" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={loading || curPage >= pageCount - 1}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
