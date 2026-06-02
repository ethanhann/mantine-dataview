import type { ColumnDataType, ColumnFormatOption } from "../types/column";

type Formatter = (value: unknown) => string;

const defaultFormatters: Record<ColumnDataType, Formatter> = {
	text: (v) => (v == null ? "" : String(v)),
	number: (v) => {
		if (v == null) return "";
		return new Intl.NumberFormat().format(Number(v));
	},
	currency: (v) => {
		if (v == null) return "";
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: "USD",
		}).format(Number(v));
	},
	date: (v) => {
		if (v == null) return "";
		const d = v instanceof Date ? v : new Date(String(v));
		if (Number.isNaN(d.getTime())) return String(v);
		return new Intl.DateTimeFormat().format(d);
	},
	boolean: (v) => {
		if (v == null) return "";
		return v ? "Yes" : "No";
	},
};

function buildIntlFormatter(
	dataType: ColumnDataType,
	options: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions,
): Formatter {
	if (dataType === "number" || dataType === "currency") {
		const fmt = new Intl.NumberFormat(
			undefined,
			dataType === "currency" ? { style: "currency", ...options } : options,
		);
		return (v) => (v == null ? "" : fmt.format(Number(v)));
	}
	if (dataType === "date") {
		const fmt = new Intl.DateTimeFormat(
			undefined,
			options as Intl.DateTimeFormatOptions,
		);
		return (v) => {
			if (v == null) return "";
			const d = v instanceof Date ? v : new Date(String(v));
			if (Number.isNaN(d.getTime())) return String(v);
			return fmt.format(d);
		};
	}
	return defaultFormatters[dataType];
}

export function resolveFormatter(
	dataType: ColumnDataType,
	columnFormat: ColumnFormatOption | undefined,
	tableDefaults:
		| Partial<Record<ColumnDataType, ColumnFormatOption>>
		| undefined,
): Formatter {
	const format = columnFormat ?? tableDefaults?.[dataType];

	if (!format) return defaultFormatters[dataType];
	if (typeof format === "function") return format as Formatter;
	return buildIntlFormatter(dataType, format);
}
