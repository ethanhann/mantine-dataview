import type { Table } from "@tanstack/react-table";
import type { ColumnDataType, ColumnFormatOption } from "../types/column";
import { resolveColumnLabel } from "./cardComposition";
import { resolveFormatter } from "./formatValue";

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
	/** When true, applies column dataType formatters to exported values. Default: false (raw values). */
	formatted?: boolean;
	formatDefaults?: Partial<Record<ColumnDataType, ColumnFormatOption>>;
}

export function exportCsv<TData>(
	table: Table<TData>,
	options?: ExportCsvOptions,
): void {
	const {
		filename = "export.csv",
		separator = ",",
		formatted = false,
		formatDefaults,
	} = options ?? {};
	const columns = table
		.getVisibleLeafColumns()
		.filter((c) => c.id !== "_select");
	const header = columns.map((c) => escapeCsv(resolveColumnLabel(c)));
	const rows = table.getRowModel().rows.map((row) =>
		columns.map((col) => {
			const cell = row.getAllCells().find((c) => c.column.id === col.id);
			const raw = cell?.getValue();
			if (formatted && col.columnDef.meta?.dataType) {
				const formatter = resolveFormatter(
					col.columnDef.meta.dataType,
					col.columnDef.meta.format,
					formatDefaults,
				);
				return escapeCsv(formatter(raw));
			}
			return escapeCsv(raw);
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
