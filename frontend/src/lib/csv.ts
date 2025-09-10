function escapeCell(v: any): string {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  export function toCsv(rows: (string | number)[][]) {
    return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  }
  export function downloadCsv(filename: string, rows: (string | number)[][]) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }
  