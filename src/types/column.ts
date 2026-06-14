// Column model. A single `DataColumnDef` drives both renderers. Card layout, filter UI, and
// labels live on the column itself through module augmentation of TanStack's `ColumnMeta`. That
// gives one source of truth, which is what makes parity between the table and the cards automatic.

import type { Column, ColumnDef, RowData } from "@tanstack/react-table";
import type { ComponentType } from "react";

/**
 * The column definition consumers author. Use it with `satisfies DataColumnDef<T>[]`.
 *
 * The value type is `any` to mirror TanStack's own `TableOptions['columns']`. A column array is
 * mixed because each column resolves a different value type. A single `unknown` cannot hold them
 * without variance errors, and it would break the `satisfies` pattern. Consumers still get full
 * `TData` typing and the augmented `meta` below.
 */
// biome-ignore lint/suspicious/noExplicitAny: matches @tanstack/react-table's columns type
export type DataColumnDef<TData> = ColumnDef<TData, any>;

/** Where a column's value lands in the default card composition. */
export type CardRole =
	| "title"
	| "subtitle"
	| "badge"
	| "media"
	| "meta"
	| "hidden";

/** Declarative filter UI. The toolbar renders it identically in both views. */
export type FilterVariant =
	| "text"
	| "select"
	| "multiselect"
	| "numberRange"
	| "date"
	| "dateRange"
	| "boolean";

export type ColumnAlign = "left" | "center" | "right";

export type ColumnDataType =
	| "text"
	| "number"
	| "currency"
	| "date"
	| "boolean";

export type NumberFormatOptions = Intl.NumberFormatOptions;
export type DateFormatOptions = Intl.DateTimeFormatOptions;

/**
 * Column format override. The options object must match the column's `dataType`: pass
 * {@link NumberFormatOptions} for `number`/`currency` columns and {@link DateFormatOptions} for
 * `date` columns. A mismatched options object is silently ignored by `Intl`; use a `(value) =>
 * string` function for full control.
 */
export type ColumnFormatOption =
	| NumberFormatOptions
	| DateFormatOptions
	| ((value: unknown) => string);

export interface CardFieldMeta {
	role?: CardRole;
	/** Ordering within its role group. */
	order?: number;
	/** Render the field label next to the value. */
	showLabel?: boolean;
}

export interface FilterOption {
	label: string;
	value: string;
}

/** Props received by a custom filter component. */
export interface CustomFilterComponentProps {
	/** Current filter value. `undefined` means no filter is active. */
	value: unknown;
	/** Update the filter value. Pass `undefined` to clear. */
	onChange: (value: unknown) => void;
	// biome-ignore lint/suspicious/noExplicitAny: column generic varies per column
	column: Column<any>;
}

/**
 * Filter UI metadata. Two forms: a built-in `variant` (where `variant` is required and `component`
 * absent), or a custom `component` (where `variant` is optional). When a custom `component` is used,
 * consumers must not assume `meta.filter.variant` is defined.
 */
export type ColumnFilterMeta =
	| {
			variant: FilterVariant;
			options?: FilterOption[];
			placeholder?: string;
			/** Min bound for `numberRange` variant. When both min and max are set, renders a RangeSlider. */
			min?: number;
			/** Max bound for `numberRange` variant. When both min and max are set, renders a RangeSlider. */
			max?: number;
			/** Step increment for the RangeSlider. Default: 1. */
			step?: number;
			component?: undefined;
	  }
	| {
			component: ComponentType<CustomFilterComponentProps>;
			variant?: FilterVariant;
			options?: FilterOption[];
			placeholder?: string;
			min?: number;
			max?: number;
			step?: number;
	  };

declare module "@tanstack/react-table" {
	// biome-ignore lint/suspicious/noEmptyInterface: required for TanStack module augmentation
	interface TableMeta<TData extends RowData> {
		/** Current view mode, available in cell renderers via `ctx.table.options.meta?.viewMode`. */
		viewMode?: "table" | "cards";
	}

	// The type parameters are required to match TanStack's declaration for merging, even
	// though this augmentation does not reference them.
	interface ColumnMeta<TData extends RowData, TValue> {
		/** Human label used by the toolbar, sort control, and card field labels. */
		label?: string;
		/** Controls how this column appears in card view. */
		card?: CardFieldMeta;
		/** Declarative filter UI. It renders identically in both views. */
		filter?: ColumnFilterMeta;
		align?: ColumnAlign;
		/** Column data type. Enables automatic value formatting when no explicit `cell` is provided. */
		dataType?: ColumnDataType;
		/** Column-level format override. Intl options object or a `(value) => string` function. */
		format?: ColumnFormatOption;
	}
}
