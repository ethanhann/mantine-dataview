// Toolbar. Search, filters, sort, column visibility, and the view switch are all shared
// affordances that drive one core state, so they behave the same for the table and the cards.
// Each section can be turned off, and sensible defaults derive from the column model.

import {
	CloseButton,
	Group,
	type GroupProps,
	Stack,
	TextInput,
} from "@mantine/core";
import type { ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";
import { SearchIcon } from "../icons";
import { FilterControls, useFilterLayout } from "./FilterControls";
import { SortControl } from "./SortControl";
import { ViewSwitcher } from "./ViewSwitcher";
import { VisibilityMenu } from "./VisibilityMenu";

export interface DataToolbarProps<TData> extends Omit<GroupProps, "children"> {
	/** The `useDataView` instance to drive. */
	view: UseDataViewReturn<TData>;
	searchPlaceholder?: string;
	/**
	 * Filterable columns up to this count render inline on desktop; beyond it they collapse into a
	 * popover. On small screens filters always open in a bottom drawer regardless of this threshold.
	 */
	filterInlineThreshold?: number;
	lockSwitcherOnMobile?: boolean;
	showSearch?: boolean;
	showFilters?: boolean;
	showSort?: boolean;
	showVisibility?: boolean;
	showViewSwitcher?: boolean;
	/** Disable search, filter, and sort controls while data is loading. Default: true. */
	disableWhileLoading?: boolean;
	/** Content injected at the start of the left control group (before search). */
	leftSection?: ReactNode;
	/** Content injected at the end of the right control group (after view switcher). */
	rightSection?: ReactNode;
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
	leftSection,
	rightSection,
	...groupProps
}: DataToolbarProps<TData>) {
	const { table, state } = view;
	const loading = disableWhileLoading && view.status === "loading";
	const searchOn = showSearch ?? table.options.enableGlobalFilter !== false;
	const filtersOn = showFilters ?? view.filterableColumns.length > 0;
	const sortOn = showSort ?? view.sortableColumns.length > 0;
	const visibilityOn = showVisibility ?? true;
	const switcherOn = showViewSwitcher ?? true;

	// Inline filters are label-on-top controls, so instead of seating them next to the single-line
	// search/sort controls they get their own row beneath the control bar. When there are too many
	// filters to inline they collapse into a single popover/drawer button, which is single-line and
	// stays up on the control bar alongside search and sort.
	const { isInline } = useFilterLayout(view, filterInlineThreshold);
	const inlineFiltersOn = filtersOn && isInline;
	const collapsedFiltersOn = filtersOn && !isInline;

	const controlBar = (
		<Group justify="space-between" wrap="wrap" gap="sm" {...groupProps}>
			<Group wrap="wrap" gap="sm">
				{leftSection}
				{searchOn && (
					<TextInput
						aria-label="Search"
						placeholder={searchPlaceholder}
						leftSection={<SearchIcon />}
						disabled={loading}
						value={state.globalFilter ?? ""}
						onChange={(e) => table.setGlobalFilter(e.currentTarget.value)}
						rightSection={
							state.globalFilter ? (
								<CloseButton
									size="sm"
									aria-label="Clear search"
									disabled={loading}
									onClick={() => table.setGlobalFilter("")}
								/>
							) : undefined
						}
					/>
				)}
				{collapsedFiltersOn && (
					<FilterControls
						view={view}
						inlineThreshold={filterInlineThreshold}
						disabled={loading}
					/>
				)}
				{sortOn && <SortControl view={view} disabled={loading} />}
			</Group>
			<Group wrap="wrap" gap="sm">
				{visibilityOn && <VisibilityMenu view={view} disabled={loading} />}
				{switcherOn && (
					<ViewSwitcher
						view={view}
						lockSwitcherOnMobile={lockSwitcherOnMobile}
						disabled={loading}
					/>
				)}
				{rightSection}
			</Group>
		</Group>
	);

	if (!inlineFiltersOn) return controlBar;

	return (
		<Stack gap="sm">
			{controlBar}
			{/* Bottom-align so every filter's input sits on one baseline. The labeled controls share a
			    height, while the custom controls and the reset button are shorter — without this they
			    float to the vertical center instead of lining up with the inputs. */}
			<Group wrap="wrap" gap="sm" align="flex-start">
				<FilterControls
					view={view}
					inlineThreshold={filterInlineThreshold}
					disabled={loading}
				/>
			</Group>
		</Stack>
	);
}
