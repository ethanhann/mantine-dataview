import {
	type ColumnHelper,
	createColumnHelper as createTanstackColumnHelper,
	type RowData,
} from "@tanstack/react-table";
import type { DataViewFeatures } from "../../types/table";

/**
 * Creates the helper that builds typed accessor, display, and group columns for a row type. It wraps
 * the TanStack `createColumnHelper` with the library's table features already applied.
 * For example, `createColumnHelper<User>().accessor("name", { header: "Name" })`.
 */
export function createColumnHelper<TData extends RowData>(): ColumnHelper<
	DataViewFeatures,
	TData
> {
	return createTanstackColumnHelper<DataViewFeatures, TData>();
}
