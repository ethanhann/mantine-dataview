// Every built-in UI string, overridable in one place for localization. Pass `labels` to
// `useDataView`/`useDataViewFetcher`; the resolved dictionary is exposed as `view.labels` and every
// component reads it from there. Explicit per-component string props (e.g. the toolbar's
// `searchPlaceholder`) still win over the dictionary. Cell value formatting is not covered here —
// it already localizes through `Intl` and the `format`/`formatDefaults` pipeline.

export interface DataViewLabels {
	/** Accessible name of the toolbar search input. */
	search: string;
	searchPlaceholder: string;
	/** Accessible name of the search input's clear button. */
	clearSearch: string;
	/** The collapsed filter trigger and the mobile filter drawer title. */
	filters: string;
	/** The collapsed filter trigger while filters are active. */
	filtersWithCount: (count: number) => string;
	/** The reset action inside the filter surface. */
	resetFilters: string;
	/** The per-filter clear link. */
	clearFilter: string;
	/** Accessible name and placeholder of the toolbar sort select. */
	sortBy: string;
	toggleSortDirection: string;
	/** The column visibility/pinning menu trigger. */
	columns: string;
	pinColumnLeft: (column: string) => string;
	pinColumnRight: (column: string) => string;
	/** Accessible name of the view switcher. */
	view: string;
	tableView: string;
	cardsView: string;
	/** Tooltip on the disabled switcher while cards are forced on small screens. */
	cardsForcedOnMobile: string;
	/** Boolean filter segments. */
	filterAll: string;
	filterYes: string;
	filterNo: string;
	/** Unbounded number-range filter inputs. */
	filterMin: string;
	filterMax: string;
	/** A label with a facet or filter count, e.g. `Yes (5)`. */
	withCount: (label: string, count: number) => string;
	/** Selection checkbox accessible names. */
	selectRow: string;
	selectAllRows: string;
	selectCard: string;
	/** Accessible name of a sortable column header button. */
	sortByColumn: (column: string) => string;
	/** Accessible name of the multi-sort priority badge. */
	sortPriority: (priority: number) => string;
	/** Accessible name of the bulk actions bar. */
	bulkActions: string;
	selectedCount: (count: number) => string;
	/** The bulk bar's clear-selection button. */
	clearSelection: string;
	/** Default error, empty, and filtered-empty states. */
	errorMessage: string;
	retry: string;
	noResults: string;
	noMatches: string;
	clearFilters: string;
	/** Accessible name of the page-size select. */
	rowsPerPage: string;
	paginationRange: (start: number, end: number, total: number) => string;
	/** Accessible name of a pager control; `control` is `first`, `previous`, `next`, or `last`. */
	paginationControl: (control: string) => string;
	/** Schedule-family navigation. */
	today: string;
	previous: string;
	next: string;
	levelDay: string;
	levelWeek: string;
	levelMonth: string;
	levelYear: string;
	/** Accessible name of the calendar level selector. */
	calendarLevel: string;
	/** Accessible name of the agenda range selector. */
	agendaRange: string;
}

export const DEFAULT_LABELS: DataViewLabels = {
	search: "Search",
	searchPlaceholder: "Search…",
	clearSearch: "Clear search",
	filters: "Filters",
	filtersWithCount: (count) => `Filters (${count})`,
	resetFilters: "Reset filters",
	clearFilter: "clear",
	sortBy: "Sort by",
	toggleSortDirection: "Toggle sort direction",
	columns: "Columns",
	pinColumnLeft: (column) => `Pin ${column} left`,
	pinColumnRight: (column) => `Pin ${column} right`,
	view: "View",
	tableView: "Table",
	cardsView: "Cards",
	cardsForcedOnMobile: "Cards are shown on small screens",
	filterAll: "All",
	filterYes: "Yes",
	filterNo: "No",
	filterMin: "Min",
	filterMax: "Max",
	withCount: (label, count) => `${label} (${count})`,
	selectRow: "Select row",
	selectAllRows: "Select all rows on this page",
	selectCard: "Select card",
	sortByColumn: (column) => `Sort by ${column}`,
	sortPriority: (priority) => `sort priority ${priority}`,
	bulkActions: "Bulk actions",
	selectedCount: (count) => `${count} selected`,
	clearSelection: "Clear",
	errorMessage: "Something went wrong.",
	retry: "Retry",
	noResults: "No results.",
	noMatches: "No matches.",
	clearFilters: "Clear filters",
	rowsPerPage: "Rows per page",
	paginationRange: (start, end, total) => `${start}–${end} of ${total}`,
	paginationControl: (control) => `${control} page`,
	today: "Today",
	previous: "Previous",
	next: "Next",
	levelDay: "Day",
	levelWeek: "Week",
	levelMonth: "Month",
	levelYear: "Year",
	calendarLevel: "Calendar level",
	agendaRange: "Agenda range",
};

/** Merges consumer overrides over the English defaults. */
export function resolveLabels(
	overrides: Partial<DataViewLabels> | undefined,
): DataViewLabels {
	return overrides ? { ...DEFAULT_LABELS, ...overrides } : DEFAULT_LABELS;
}
