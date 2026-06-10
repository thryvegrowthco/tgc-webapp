// Shared CSV helpers for admin exports (RFC 4180 quoting). Extracted from the
// job-alerts / newsletter export routes so every export quotes identically.

/** Quote a single cell if it contains a comma, quote, or newline. */
export function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV string from a header row + data rows. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map((h) => csvCell(h)).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => csvCell(String(cell))).join(","));
  }
  return lines.join("\r\n");
}
