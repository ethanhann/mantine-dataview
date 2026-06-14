import type { ColumnDataType, ColumnFormatOption } from "../types/column";

type Formatter = (value: unknown) => string;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a value into a Date. Date-only strings (`YYYY-MM-DD`) are parsed in local time rather than
 * UTC, so they don't render as the previous day for users in negative-UTC offsets.
 */
function parseDate(value: unknown): Date {
	if (value instanceof Date) return value;
	const str = String(value);
	const m = DATE_ONLY_RE.exec(str);
	if (m) {
		const [y, mo, d] = str.split("-");
		return new Date(Number(y), Number(mo) - 1, Number(d));
	}
	return new Date(str);
}

/** Coerces a value to a number, returning `null` when it cannot be represented numerically. */
function coerceNumber(value: unknown): number | null {
	// An empty string would coerce to 0, silently rendering a blank field as "0"/"$0.00".
	if (value === "") return null;
	const n = Number(value);
	return Number.isNaN(n) ? null : n;
}

function stringifyText(value: unknown): string {
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

const defaultFormatters: Record<ColumnDataType, Formatter> = {
	text: stringifyText,
	number: (v) => {
		if (v == null) return "";
		const n = coerceNumber(v);
		if (n == null) return String(v);
		return new Intl.NumberFormat().format(n);
	},
	currency: (v) => {
		if (v == null) return "";
		const n = coerceNumber(v);
		if (n == null) return String(v);
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: "USD",
		}).format(n);
	},
	date: (v) => {
		if (v == null) return "";
		const d = parseDate(v);
		if (Number.isNaN(d.getTime())) return String(v);
		return new Intl.DateTimeFormat().format(d);
	},
	boolean: (v) => {
		if (v == null) return "";
		if (typeof v === "string") {
			const lower = v.trim().toLowerCase();
			if (lower === "false" || lower === "0" || lower === "no") return "No";
			if (lower === "true" || lower === "1" || lower === "yes") return "Yes";
		}
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
		return (v) => {
			if (v == null) return "";
			const n = coerceNumber(v);
			if (n == null) return String(v);
			return fmt.format(n);
		};
	}
	if (dataType === "date") {
		const fmt = new Intl.DateTimeFormat(
			undefined,
			options as Intl.DateTimeFormatOptions,
		);
		return (v) => {
			if (v == null) return "";
			const d = parseDate(v);
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
