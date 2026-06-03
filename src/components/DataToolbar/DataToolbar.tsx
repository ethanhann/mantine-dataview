// Toolbar. Search, filters, sort, column visibility, and the view switch are all shared
// affordances that drive one core state, so they behave the same for the table and the cards.
// Each section can be turned off, and sensible defaults derive from the column model.

import { CloseButton, Group, type GroupProps, TextInput } from "@mantine/core";
import type { UseDataViewReturn } from "../../types/options";
import { SearchIcon } from "../icons";
import { FilterControls } from "./FilterControls";
import { SortControl } from "./SortControl";
import { ViewSwitcher } from "./ViewSwitcher";
import { VisibilityMenu } from "./VisibilityMenu";

export interface DataToolbarProps<TData> extends Omit<GroupProps, "children"> {
	/** The `useDataView` instance to drive. */
	view: UseDataViewReturn<TData>;
	searchPlaceholder?: string;
	/** Filterable columns up to this count render inline. More than that collapse into a popover. */
	filterInlineThreshold?: number;
	lockSwitcherOnMobile?: boolean;
	showSearch?: boolean;
	showFilters?: boolean;
	showSort?: boolean;
	showVisibility?: boolean;
	showViewSwitcher?: boolean;
	/** Disable search, filter, and sort controls while data is loading. Default: true. */
	disableWhileLoading?: boolean;
}

export function DataToolbar<TData>({
	view,
	searchPlaceholder = "Search…",
	filterInlineThreshold = 3,
	lockSwitcherOnMobile,
	showSearch,
	showFilters,
	showSort,
	showVisibility,
	showViewSwitcher,
	disableWhileLoading = true,
	...groupProps
}: DataToolbarProps<TData>) {
	const { table, state } = view;
	const loading = disableWhileLoading && view.status === "loading";
	const searchOn = showSearch ?? table.options.enableGlobalFilter !== false;
	const filtersOn = showFilters ?? view.filterableColumns.length > 0;
	const sortOn = showSort ?? view.sortableColumns.length > 0;
	const visibilityOn = showVisibility ?? true;
	const switcherOn = showViewSwitcher ?? true;

	return (
		<Group justify="space-between" wrap="wrap" gap="sm" {...groupProps}>
			<Group wrap="wrap" gap="sm">
				{searchOn && (
					<TextInput
						aria-label="Search"
						placeholder={searchPlaceholder}
						leftSection={<SearchIcon />}
						value={state.globalFilter}
						onChange={(e) => table.setGlobalFilter(e.currentTarget.value)}
						rightSection={
							state.globalFilter ? (
								<CloseButton
									size="sm"
									aria-label="Clear search"
									onClick={() => table.setGlobalFilter("")}
								/>
							) : undefined
						}
					/>
				)}
				<fieldset
					disabled={loading}
					style={{ display: "contents", border: "none", padding: 0, margin: 0 }}
				>
					{filtersOn && (
						<FilterControls
							view={view}
							inlineThreshold={filterInlineThreshold}
						/>
					)}
					{sortOn && <SortControl view={view} />}
				</fieldset>
			</Group>
			<fieldset
				disabled={loading}
				style={{ display: "contents", border: "none", padding: 0, margin: 0 }}
			>
				<Group wrap="wrap" gap="sm">
					{visibilityOn && <VisibilityMenu view={view} />}
					{switcherOn && (
						<ViewSwitcher
							view={view}
							lockSwitcherOnMobile={lockSwitcherOnMobile}
						/>
					)}
				</Group>
			</fieldset>
		</Group>
	);
}
