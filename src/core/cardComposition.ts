// Default card composition. It projects the column model into a layout bucketed by role that
// `<DataCards>` renders. Reading from `table.getVisibleLeafColumns()` means card fields honor
// `columnVisibility` on their own. The same toggle hides a table column and its card field,
// which is the parity decision to share visibility between the two views.

import type { Column, Table } from "@tanstack/react-table";
import type { CardRole } from "../types/column";
import { humanize } from "./colBuilder";

/** Roles that produce a rendered slot; `hidden` columns are dropped from the layout. */
export type CardLayoutRole = Exclude<CardRole, "hidden">;

export interface CardField<TData> {
	id: string;
	column: Column<TData>;
	/** Resolved display label. It prefers meta.label, then a string header, then the column id. */
	label: string;
	/** Whether to render the label beside the value as a pair. */
	showLabel: boolean;
}

export interface CardLayout<TData> {
	title: CardField<TData>[];
	subtitle: CardField<TData>[];
	media: CardField<TData>[];
	badge: CardField<TData>[];
	meta: CardField<TData>[];
}

export interface ComposeCardOptions {
	/**
	 * Role for visible accessor columns that declare no `card.role`. The default is `'meta'`.
	 * Set it to `'hidden'` to make card fields opt in. Display columns have no accessor, such as
	 * an actions column, and are always hidden unless they declare an explicit role.
	 */
	fallbackRole?: CardLayoutRole | "hidden";
}

/** The label used by card fields, the sort control, and toolbar filters. It is the one source. */
export function resolveColumnLabel<TData>(column: Column<TData>): string {
	const { meta, header } = column.columnDef;
	if (meta?.label) return meta.label;
	if (typeof header === "string") return header;
	// Humanize the raw id (e.g. "created_at" → "Created At") so hand-authored columns without a
	// label still read well, matching the builder's auto-generated labels.
	return humanize(column.id);
}

function resolveRole<TData>(
	column: Column<TData>,
	explicit: CardRole | undefined,
	fallback: CardLayoutRole | "hidden",
): CardLayoutRole | null {
	if (explicit) return explicit === "hidden" ? null : explicit;
	// Display columns cannot produce a value, so they stay out of the card by default.
	if (column.accessorFn == null) return null;
	return fallback === "hidden" ? null : fallback;
}

interface Ranked<TData> {
	field: CardField<TData>;
	/** Explicit `meta.card.order`, or `undefined` when the field relies on natural position. */
	order: number | undefined;
	index: number;
}

/**
 * Builds the card layout from the columns that are currently visible. Within each role group the
 * fields are ordered by `meta.card.order`, falling back to the column's declared position.
 */
export function composeCardLayout<TData>(
	table: Table<TData>,
	options: ComposeCardOptions = {},
): CardLayout<TData> {
	const fallback = options.fallbackRole ?? "meta";
	const buckets: Record<CardLayoutRole, Ranked<TData>[]> = {
		title: [],
		subtitle: [],
		media: [],
		badge: [],
		meta: [],
	};

	table.getVisibleLeafColumns().forEach((column, index) => {
		const card = column.columnDef.meta?.card;
		const role = resolveRole(column, card?.role, fallback);
		if (!role) return;
		buckets[role].push({
			order: card?.order,
			index,
			field: {
				id: column.id,
				column,
				label: resolveColumnLabel(column),
				showLabel: card?.showLabel ?? role === "meta",
			},
		});
	});

	// Fields with an explicit `order` lead, sorted by that order; the rest follow in natural column
	// position. This avoids interleaving a small explicit order with large index fallbacks (and
	// vice versa) in one shared numeric space.
	const extract = (ranked: Ranked<TData>[]): CardField<TData>[] => {
		const explicit = ranked
			.filter((r) => r.order != null)
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.index - b.index);
		const natural = ranked
			.filter((r) => r.order == null)
			.sort((a, b) => a.index - b.index);
		return [...explicit, ...natural].map((r) => r.field);
	};

	return {
		title: extract(buckets.title),
		subtitle: extract(buckets.subtitle),
		media: extract(buckets.media),
		badge: extract(buckets.badge),
		meta: extract(buckets.meta),
	};
}
