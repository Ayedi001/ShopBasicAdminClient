/** CSV builder producing UTF-8 with BOM and ";" separator so Excel (FR locale) opens it directly. */
export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined | Date)[][]): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    let s = v instanceof Date ? v.toISOString().replace("T", " ").slice(0, 19) : String(v);
    // Neutralise spreadsheet formula injection
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const money = (m: number) => (m / 1000).toFixed(3).replace(".", ",");
