import type { Table } from "@tanstack/react-table";
import type { ColumnDataType, ColumnFormatOption } from "../types/column";
import { resolveColumnLabel } from "./cardComposition";
import { resolveFormatter } from "./formatValue";

/** Characters that trigger spreadsheet formula evaluation when they lead a cell. */
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/** Convert an arbitrary cell value to a string suitable for CSV output. */
function stringifyValue(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "object") {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}
	return String(value);
}

function escapeCsv(
	value: unknown,
	separator: string,
	sanitizeFormulas: boolean,
): string {
	let str = stringifyValue(value);
	// Neutralize spreadsheet formula injection by prefixing a single quote so the
	// value is treated as text rather than a formula (Excel/Sheets/LibreOffice).
	// charAt returns "" for an empty string, which is never a trigger.
	if (sanitizeFormulas && FORMULA_TRIGGERS.includes(str.charAt(0))) {
		str = `'${str}`;
	}
	if (
		str.includes(separator) ||
		str.includes('"') ||
		str.includes("\n") ||
		str.includes("\r")
	) {
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
	/**
	 * When true (default), prefixes values that begin with `= + - @` (and tab/CR)
	 * with a single quote to prevent spreadsheet formula injection. Set to false
	 * only when the output is consumed by a parser that is not a spreadsheet.
	 */
	sanitizeFormulas?: boolean;
}

export function exportCsv<TData>(
	table: Table<TData>,
	options?: ExportCsvOptions,
): void {
	if (typeof document === "undefined") {
		throw new Error("exportCsv requires a browser environment (document is undefined).");
	}
	const {
		filename = "export.csv",
		separator = ",",
		formatted = false,
		formatDefaults,
		sanitizeFormulas = true,
	} = options ?? {};
	const columns = table
		.getVisibleLeafColumns()
		.filter((c) => c.id !== "_select");
	if (columns.length === 0) return;
	const header = columns.map((c) =>
		escapeCsv(resolveColumnLabel(c), separator, sanitizeFormulas),
	);
	const rows = table.getRowModel().rows.map((row) =>
		columns.map((col) => {
			const raw = row.getValue(col.id);
			if (formatted && col.columnDef.meta?.dataType) {
				const formatter = resolveFormatter(
					col.columnDef.meta.dataType,
					col.columnDef.meta.format,
					formatDefaults,
				);
				return escapeCsv(formatter(raw), separator, sanitizeFormulas);
			}
			return escapeCsv(raw, separator, sanitizeFormulas);
		}),
	);

	// RFC 4180 row terminator.
	const csv = [header, ...rows].map((r) => r.join(separator)).join("\r\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	// Some browsers (notably Firefox) require the anchor to be in the document
	// for a synthetic click to trigger the download.
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	// Defer revocation so the download isn't cancelled mid-flight.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
