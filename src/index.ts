// Public entry for @ethanhann/mantine-dataview.
// It exports the components and the `useDataView` hook.

export type {
	Column,
	ColumnDef,
	Row,
	RowData,
	Table,
} from "@tanstack/react-table";
// This comes from TanStack so consumers get typed accessor and display columns. It avoids a
// direct dependency on the table core.
export { createColumnHelper } from "@tanstack/react-table";
// Presentations.
export {
	DataBulkActions,
	type DataBulkActionsProps,
} from "./components/DataBulkActions";
export { DataCards, type DataCardsProps } from "./components/DataCards";
export {
	DataPagination,
	type DataPaginationProps,
} from "./components/DataPagination";
export { DataTable, type DataTableProps } from "./components/DataTable";
export {
	DataToolbar,
	type DataToolbarProps,
	FilterControl,
} from "./components/DataToolbar";
export {
	DataView,
	type DataViewBodyProps,
	type DataViewContextValue,
	type DataViewProps,
	type DataViewToolbarProps,
	useDataViewContext,
} from "./components/DataView";
export type {
	CardSlotContext,
	DataViewSlots,
	EmptySlotContext,
	ErrorSlotContext,
	RenderCardContext,
	RowSlotContext,
} from "./components/types";
// Card composition. It supports custom card renderers built on the default layout.
export {
	type CardField,
	type CardLayout,
	type CardLayoutRole,
	type ComposeCardOptions,
	composeCardLayout,
	resolveColumnLabel,
} from "./core/cardComposition";
// Fluent column builder.
export { type ColOptions, ColumnBuilder, col } from "./core/colBuilder";
// CSV export utility.
export { type ExportCsvOptions, exportCsv } from "./core/exportCsv";
// Core hook.
export { useDataView } from "./core/useDataView";
// Optional wrapper that manages fetching.
export {
	type UseDataViewFetcherOptions,
	useDataViewFetcher,
} from "./core/useDataViewFetcher";

// Public types. Importing any of these loads the `ColumnMeta` augmentation.
export type {
	CardFieldMeta,
	CardRole,
	ColumnAlign,
	ColumnDataType,
	ColumnFilterMeta,
	ColumnFormatOption,
	CustomFilterComponentProps,
	DataColumnDef,
	DateFormatOptions,
	FilterOption,
	FilterVariant,
	NumberFormatOptions,
} from "./types/column";
export type {
	FacetData,
	RangeFacet,
	RangeFacetEntry,
	ValueFacet,
	ValueFacetEntry,
} from "./types/facets";
export type {
	DataViewSelection,
	DebounceOptions,
	ResponsiveOptions,
	UrlSyncOptions,
	UseDataViewOptions,
	UseDataViewReturn,
} from "./types/options";
export type {
	DataViewRequest,
	DataViewResponse,
	FilterParam,
} from "./types/request";
export type {
	DataViewColumnPinning,
	DataViewFilter,
	DataViewPagination,
	DataViewSort,
	DataViewState,
	DataViewStatus,
	Status,
	ViewMode,
} from "./types/state";
// URL sync contracts. The runtime adapter ships from the `/url` subpath.
export type { UrlSerializer, UrlStateAdapter } from "./url/types";
