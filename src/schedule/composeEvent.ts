// Projects a row into a library-neutral calendar event using the columns' declarative
// `meta.schedule` roles. Pure and dependency-free (no `@mantine/schedule`, no `dayjs`), so it is
// fully unit-testable on its own. The schedule presentation adapts the returned `DataViewEvent`
// to Mantine's concrete event shape; the `toEvent` escape hatch bypasses this entirely.

import type { DataColumnDef } from "../types/column";
import type {
	DataViewEvent,
	ScheduleFieldMeta,
	ScheduleRole,
} from "../types/schedule";

export interface ComposeEventOptions<TData> {
	columns: DataColumnDef<TData>[];
	/** Stable id for the event, normally the core's `getRowId`. */
	getRowId: (row: TData) => string;
	/** Fallback length in minutes when only a `start` is resolvable. Default `60`. */
	defaultDuration?: number;
}

const DEFAULT_DURATION_MIN = 60;
const MS_PER_MINUTE = 60_000;

function isDev(): boolean {
	return (
		typeof process !== "undefined" && process.env.NODE_ENV !== "production"
	);
}

/** Reads a column's value from a raw row via its accessor (function, key, or dotted key path). */
function readValue<TData>(col: DataColumnDef<TData>, row: TData): unknown {
	// biome-ignore lint/suspicious/noExplicitAny: column defs are heterogeneously typed
	const anyCol = col as any;
	if (typeof anyCol.accessorFn === "function") return anyCol.accessorFn(row, 0);
	const key = anyCol.accessorKey;
	if (key == null) return undefined;
	// biome-ignore lint/suspicious/noExplicitAny: walking an arbitrary row shape
	let cur: any = row;
	for (const part of String(key).split(".")) {
		if (cur == null) return undefined;
		cur = cur[part];
	}
	return cur;
}

/** Coerces a `Date`, epoch ms number, or date string into a valid `Date`, or `null` if invalid. */
function toDate(value: unknown): Date | null {
	if (value == null) return null;
	const date =
		value instanceof Date ? value : new Date(value as string | number);
	return Number.isNaN(date.getTime()) ? null : date;
}

const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** Parses a duration to minutes: a number (already minutes), a numeric string, or ISO-8601. */
function toDurationMinutes(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
	const m = ISO_DURATION.exec(value);
	if (!m || value === "P") return null;
	const [, d, h, min, s] = m;
	return (
		(d ? Number(d) * 1440 : 0) +
		(h ? Number(h) * 60 : 0) +
		(min ? Number(min) : 0) +
		(s ? Number(s) / 60 : 0)
	);
}

interface RoleColumn<TData> {
	col: DataColumnDef<TData>;
	meta: ScheduleFieldMeta;
}

/** First column per role wins; later duplicates are ignored (warned in dev). */
function indexRoles<TData>(
	columns: DataColumnDef<TData>[],
): Partial<Record<ScheduleRole, RoleColumn<TData>>> {
	const byRole: Partial<Record<ScheduleRole, RoleColumn<TData>>> = {};
	for (const col of columns) {
		const meta = col.meta?.schedule;
		if (!meta) continue;
		if (byRole[meta.role]) {
			if (isDev()) {
				console.warn(
					`[mantine-dataview] multiple columns declare schedule role "${meta.role}"; the first is used.`,
				);
			}
			continue;
		}
		byRole[meta.role] = { col, meta };
	}
	return byRole;
}

function resolve<TData>(
	rc: RoleColumn<TData> | undefined,
	row: TData,
): unknown {
	if (!rc) return undefined;
	const raw = readValue(rc.col, row);
	return rc.meta.map ? rc.meta.map(raw, row) : raw;
}

/**
 * Composes one row into a {@link DataViewEvent} from the columns' `meta.schedule` roles. Returns
 * `null` when no valid `start` can be resolved (the row is dropped from the calendar). Throws in
 * dev when a column set tags both `end` and `duration` (an ambiguous spec); in production the
 * `end` role wins.
 */
export function composeEvent<TData>(
	row: TData,
	options: ComposeEventOptions<TData>,
): DataViewEvent<TData> | null {
	const roles = indexRoles(options.columns);

	if (roles.end && roles.duration) {
		const message =
			'[mantine-dataview] a column set declares both "end" and "duration" schedule roles; they are mutually exclusive.';
		if (isDev()) throw new Error(message);
		// Production: prefer the explicit end and continue.
	}

	const start = toDate(resolve(roles.start, row));
	if (!start) {
		if (isDev()) {
			console.warn(
				"[mantine-dataview] a row has no resolvable schedule start; it is omitted from the calendar.",
			);
		}
		return null;
	}

	let end: Date | null = null;
	if (roles.end) {
		end = toDate(resolve(roles.end, row));
	} else if (roles.duration) {
		const minutes = toDurationMinutes(resolve(roles.duration, row));
		if (minutes != null)
			end = new Date(start.getTime() + minutes * MS_PER_MINUTE);
	}
	if (!end) {
		const fallback = options.defaultDuration ?? DEFAULT_DURATION_MIN;
		end = new Date(start.getTime() + fallback * MS_PER_MINUTE);
	}

	const titleValue = resolve(roles.title, row);
	const colorValue = resolve(roles.color, row);
	const resourceValue = resolve(roles.resource, row);
	const allDayValue = resolve(roles.allDay, row);

	return {
		id: options.getRowId(row),
		title: titleValue == null ? "" : String(titleValue),
		start,
		end,
		row,
		...(colorValue != null ? { color: String(colorValue) } : {}),
		...(resourceValue != null ? { resourceId: String(resourceValue) } : {}),
		...(allDayValue != null ? { allDay: Boolean(allDayValue) } : {}),
	};
}
