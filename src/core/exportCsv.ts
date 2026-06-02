import type { Table } from "@tanstack/react-table";
import { resolveColumnLabel } from "./cardComposition";

function escapeCsv(value: unknown): string {
	const str = value == null ? "" : String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export interface ExportCsvOptions {
	filename?: string;
	separator?: string;
}

export function exportCsv<TData>(
	table: Table<TData>,
	options?: ExportCsvOptions,
): void {
	const { filename = "export.csv", separator = "," } = options ?? {};
	const columns = table
		.getVisibleLeafColumns()
		.filter((c) => c.id !== "_select");
	const header = columns.map((c) => escapeCsv(resolveColumnLabel(c)));
	const rows = table.getRowModel().rows.map((row) =>
		columns.map((col) => {
			const cell = row.getAllCells().find((c) => c.column.id === col.id);
			return escapeCsv(cell?.getValue());
		}),
	);

	const csv = [header, ...rows].map((r) => r.join(separator)).join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
