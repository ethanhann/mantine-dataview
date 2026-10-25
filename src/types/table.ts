// Use these aliases when you type a table. Each one takes only your row type.

import type {
	CellContext,
	Column,
	Header,
	HeaderContext,
	ReactTable,
	Row,
	RowData,
	TableFeature,
} from "@tanstack/react-table";

export type { RowData };

/**
 * The table features the library enables. Each key names one TanStack feature. The type is written
 * out so the published declarations refer to `@tanstack/react-table` only, which is the one
 * TanStack package that consumers install.
 */
export interface DataViewFeatures {
	columnFilteringFeature: TableFeature;
	columnOrderingFeature: TableFeature;
	columnPinningFeature: TableFeature;
	columnResizingFeature: TableFeature;
	columnSizingFeature: TableFeature;
	columnVisibilityFeature: TableFeature;
	globalFilteringFeature: TableFeature;
	rowPaginationFeature: TableFeature;
	rowSelectionFeature: TableFeature;
	rowSortingFeature: TableFeature;
}

/** The table instance returned as `view.table`. */
export type DataViewTable<TData extends RowData> = ReactTable<
	DataViewFeatures,
	TData
>;

/** One row of the table, with the original record on `row.original`. */
export type DataViewRow<TData extends RowData> = Row<DataViewFeatures, TData>;

/** One column of the table, with its definition on `column.columnDef`. */
export type DataViewColumn<TData extends RowData, TValue = unknown> = Column<
	DataViewFeatures,
	TData,
	TValue
>;

/** One header cell of the table. */
export type DataViewHeader<TData extends RowData, TValue = unknown> = Header<
	DataViewFeatures,
	TData,
	TValue
>;

/** The argument a column `cell` renderer receives. */
export type DataViewCellContext<
	TData extends RowData,
	TValue = unknown,
> = CellContext<DataViewFeatures, TData, TValue>;

/** The argument a column `header` or `footer` renderer receives. */
export type DataViewHeaderContext<
	TData extends RowData,
	TValue = unknown,
> = HeaderContext<DataViewFeatures, TData, TValue>;
