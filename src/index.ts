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
export type {
	CardSlotContext,
	DataViewSlots,
	EmptySlotContext,
	ErrorSlotContext,
	RenderCardContext,
	RowSlotContext,
} from "./components/_shared/types";
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
	ViewSwitcher,
	type ViewSwitcherProps,
} from "./components/DataToolbar";
export {
	type DataViewContextValue,
	DataViewer,
	type DataViewerBodyProps,
	type DataViewerProps,
	type DataViewerToolbarProps,
	useDataViewContext,
} from "./components/DataViewer";
// Card composition. It supports custom card renderers built on the default layout.
export {
	type CardField,
	type CardLayout,
	type CardLayoutRole,
	type ComposeCardOptions,
	composeCardLayout,
	resolveColumnLabel,
} from "./core/columns/cardComposition";
// Fluent column builder.
export { type ColOptions, ColumnBuilder, col } from "./core/columns/colBuilder";
// CSV and JSON export utilities.
export {
	type ExportCsvOptions,
	type ExportJsonOptions,
	exportCsv,
	exportJson,
} from "./core/exportCsv";
// View mode helper for cell renderers.
export { getViewMode } from "./core/getViewMode";
// Preference persistence: the storage adapter contract and the localStorage implementation.
export { localStorageAdapter } from "./core/state/persist";
// Core hook.
export { useDataView } from "./core/state/useDataView";
// Optional wrapper that manages fetching.
export {
	type UseDataViewFetcherOptions,
	useDataViewFetcher,
} from "./core/state/useDataViewFetcher";
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
// Localization: the overridable UI string dictionary and its English defaults.
export { type DataViewLabels, DEFAULT_LABELS } from "./types/labels";
export type {
	DataViewSelection,
	DebounceOptions,
	ResponsiveOptions,
	UrlSyncOptions,
	UseDataViewOptions,
	UseDataViewReturn,
} from "./types/options";
export type {
	PersistableKey,
	PersistedState,
	PersistOptions,
	StateStorageAdapter,
} from "./types/persist";
export type {
	DataViewRequest,
	DataViewResponse,
	FilterParam,
} from "./types/request";
// Schedule presentation column model. Types only — the runtime presentation ships from the
// optional `@ethanhann/mantine-dataview/schedule` subpath, so importing these pulls no scheduler.
export type {
	DataViewEvent,
	ScheduleFieldMeta,
	ScheduleRole,
} from "./types/schedule";
export type {
	DataViewColumnPinning,
	DataViewFilter,
	DataViewPagination,
	DataViewSort,
	DataViewState,
	DataViewStatus,
	DataViewWindow,
	ScheduleLevel,
	Status,
	ViewMode,
} from "./types/state";
// Windowed-view helpers, for custom layouts that branch on whether a date-window view is active.
export { isWindowedView, WINDOWED_VIEWS } from "./types/state";
// URL sync contracts. The runtime adapter ships from the `/url` subpath.
export type { UrlSerializer, UrlStateAdapter } from "./url/types";
