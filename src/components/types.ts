// Shared presentation contracts. These cover the customization slots and the common props every
// presentation accepts. Slots are render functions, so consumers can fully replace a piece while
// the library still owns layout and state wiring. Each slot is rendered through the internal `Slot`
// component (not called inline), so a slot may safely use hooks and appears as a real node in the
// React tree (visible to error boundaries and DevTools).

import type { Row } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { DataViewSelection } from "../types/options";

export interface EmptySlotContext {
	/** True when the empty result comes from active filters or search. */
	filtered: boolean;
	/** Clears all column filters and global search, returning to the unfiltered query. */
	clearFilters: () => void;
}

export interface ErrorSlotContext {
	error: unknown;
	/** Emits the current request again. */
	retry: () => void;
}

export interface RowSlotContext<TData> {
	row: Row<TData>;
	/** The cells for this row that the library renders by default, both selection and data. */
	cells: ReactNode;
}

/** Full per card escape hatch. It bypasses the default composition entirely. */
export interface RenderCardContext<TData> {
	row: Row<TData>;
	data: TData;
	selected: boolean;
	toggleSelected: () => void;
}

/** Card slot. It wraps the default composed content rather than replacing it. */
export interface CardSlotContext<TData> extends RenderCardContext<TData> {
	/** The card body composed by default, including the selection overlay and role slots. */
	children: ReactNode;
}

/** Customization slots shared by the presentations. */
export interface DataViewSlots<TData> {
	/** Empty and filtered empty states share one slot, told apart by `filtered`. */
	Empty?: (ctx: EmptySlotContext) => ReactNode;
	ErrorState?: (ctx: ErrorSlotContext) => ReactNode;
	LoadingTable?: () => ReactNode;
	LoadingCards?: () => ReactNode;
	Row?: (ctx: RowSlotContext<TData>) => ReactNode;
	Card?: (ctx: CardSlotContext<TData>) => ReactNode;
	/** Consumer actions for the bulk bar. It receives the current selection. */
	BulkActions?: (selection: DataViewSelection<TData>) => ReactNode;
}
