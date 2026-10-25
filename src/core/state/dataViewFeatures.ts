import {
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from "@tanstack/react-table";
import type { DataViewFeatures } from "../../types/table";

const features = tableFeatures({
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
});

type HaveSameKeys<A, B> = [keyof A] extends [keyof B]
	? [keyof B] extends [keyof A]
		? true
		: never
	: never;

true satisfies HaveSameKeys<typeof features, DataViewFeatures>;

/**
 * The features the library passes to `useTable`. The server owns sorting, filtering, and
 * pagination, so the table only keeps the state for these features and never builds a derived row
 * model.
 */
export const dataViewFeatures: DataViewFeatures = features;
