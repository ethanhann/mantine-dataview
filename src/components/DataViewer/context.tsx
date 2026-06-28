// Shared context for the compound <DataViewer> API. The root provides the `useDataView` instance
// once, along with the config that cuts across parts such as slots and card options. The
// subcomponents read it, so a consumer writes `<DataViewer.Body />` instead of threading `view`
// through every child.

import { createContext, useContext } from "react";
import type { ComposeCardOptions } from "../../core/cardComposition";
import type { UseDataViewReturn } from "../../types/options";
import type { DataCardsProps } from "../DataCards";
import type { DataViewSlots, RegisteredView } from "../types";

export interface DataViewContextValue<TData> {
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	renderCard?: DataCardsProps<TData>["renderCard"];
	fallbackRole?: ComposeCardOptions["fallbackRole"];
	lockSwitcherOnMobile?: boolean;
	animateRows?: boolean;
	/** Opt-in presentations (e.g. the schedule view) registered by the consumer. */
	views?: RegisteredView<TData>[];
}

// React context cannot be generic. Store it as `unknown` and narrow it again in the hook.
const DataViewContext = createContext<DataViewContextValue<unknown> | null>(
	null,
);

export const DataViewProvider = DataViewContext.Provider;

export function useDataViewContext<TData>(): DataViewContextValue<TData> {
	const ctx = useContext(DataViewContext);
	if (!ctx) {
		throw new Error(
			"DataViewer.Toolbar / DataViewer.Body / DataViewer.Pagination must be rendered inside <DataViewer>.",
		);
	}
	return ctx as DataViewContextValue<TData>;
}
