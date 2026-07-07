import type { ColumnDataType, ColumnFormatOption } from "./column";

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

export interface ExportJsonOptions {
	filename?: string;
}
