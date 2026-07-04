import { Paper, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { DataCards } from "../components/DataCards";
import { DataTable } from "../components/DataTable";
import { DataToolbar, FilterControl } from "../components/DataToolbar";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
import { createColumnHelper, type DataColumnDef } from "../index";
import { columns, createMockFetcher, type Person } from "./data";

/** The toolbar provides search, filters, column visibility, sorting controls, and a table/cards view switcher. */
const meta: Meta<typeof DataToolbar> = {
	title: "Components/DataToolbar",
	component: DataToolbar,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataToolbar>;

function Example({
	filterInlineThreshold,
}: {
	filterInlineThreshold?: number;
}) {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId: (p) => p.id,
		fetcher,
	});
	return (
		<Stack>
			<DataToolbar view={view} filterInlineThreshold={filterInlineThreshold} />
			{view.state.view === "cards" ? (
				<DataCards view={view} />
			) : (
				<DataTable view={view} withTableBorder />
			)}
		</Stack>
	);
}

export const Default: Story = { render: () => <Example /> };

/**
 * When the number of filterable columns is within `filterInlineThreshold`, filters expand inline.
 * Because they are label-on-top controls, they render on their own row beneath the control bar
 * (search, sort, column visibility, and the view switcher) so every input stays aligned.
 */
export const InlineFilters: Story = {
	render: () => <Example filterInlineThreshold={10} />,
};

/**
 * Once the filterable columns exceed `filterInlineThreshold`, the filters collapse into a single
 * popover button. That button is single-line, so it stays up on the control bar next to search and
 * sort rather than getting its own row.
 */
export const CollapsedFilters: Story = {
	render: () => <Example filterInlineThreshold={2} />,
};

const dateCol = createColumnHelper<Person>();

/**
 * The two date filter variants. `dateRange` renders a two-date calendar picker; `date` matches a
 * single day. Values round-trip as date-only ISO strings parsed in local time, so the picked day
 * never shifts across timezones.
 */
function DateFiltersExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const dateColumns = useMemo(
		() =>
			[
				...columns.slice(0, 2),
				dateCol.accessor("hiredAt", {
					header: "Hired",
					meta: {
						label: "Hired",
						dataType: "date",
						filter: { variant: "dateRange" },
					},
				}),
				dateCol.accessor("hiredAt", {
					id: "hiredAtExact",
					header: "Hired on",
					meta: {
						label: "Hired on",
						filter: { variant: "date" },
					},
				}),
			] as DataColumnDef<Person>[],
		[],
	);
	const view = useDataViewFetcher<Person>({
		columns: dateColumns,
		getRowId: (p) => p.id,
		fetcher,
	});
	return (
		<Stack>
			<DataToolbar view={view} filterInlineThreshold={10} />
			<DataTable view={view} withTableBorder />
		</Stack>
	);
}

export const DateFilters: Story = { render: () => <DateFiltersExample /> };

/**
 * Server-loaded filter options via `loadOptions(query)`. The select becomes searchable; options
 * load once on open state and reload with the debounced search text. Here the "server" filters a
 * city list with simulated latency.
 */
function AsyncOptionsExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const asyncColumns = useMemo(
		() =>
			[
				...columns.slice(0, 2),
				dateCol.accessor("location", {
					header: "Location",
					meta: {
						label: "Location",
						filter: {
							variant: "select",
							loadOptions: async (query) => {
								await new Promise((r) => setTimeout(r, 400));
								return [
									"London",
									"Oslo",
									"Berlin",
									"Tokyo",
									"Austin",
									"Toronto",
								]
									.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
									.map((c) => ({ value: c, label: c }));
							},
						},
					},
				}),
			] as DataColumnDef<Person>[],
		[],
	);
	const view = useDataViewFetcher<Person>({
		columns: asyncColumns,
		getRowId: (p) => p.id,
		fetcher,
	});
	return (
		<Stack>
			<DataToolbar view={view} filterInlineThreshold={10} />
			<DataTable view={view} withTableBorder />
		</Stack>
	);
}

export const AsyncFilterOptions: Story = {
	render: () => <AsyncOptionsExample />,
};

/**
 * `FilterControl` is exported standalone, so an individual filter can live anywhere in the layout.
 * Here the status filter sits in its own panel while the toolbar hides the filter surface. Pass
 * `labels={view.labels}` so a standalone control localizes with the rest.
 */
function StandaloneFilterExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId: (p) => p.id,
		fetcher,
	});
	const status = view.table.getColumn("status");
	return (
		<Stack>
			<Paper withBorder p="sm" maw={280}>
				<Text size="sm" fw={600} mb="xs">
					Quick filter
				</Text>
				{status && (
					<FilterControl
						column={status}
						facet={view.facets.status}
						labels={view.labels}
					/>
				)}
			</Paper>
			<DataToolbar view={view} showFilters={false} />
			<DataTable view={view} withTableBorder />
		</Stack>
	);
}

export const StandaloneFilterControl: Story = {
	render: () => <StandaloneFilterExample />,
};

/**
 * `disableWhileLoading={false}` keeps every toolbar control interactive during a fetch. Compare
 * with the default stories, where filters, sort, and the column menu grey out while loading (the
 * search input always stays enabled).
 */
function OptOutExample() {
	const fetcher = useMemo(() => createMockFetcher(undefined, 1500), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId: (p) => p.id,
		fetcher,
	});
	return (
		<Stack>
			<DataToolbar view={view} disableWhileLoading={false} />
			<DataTable view={view} withTableBorder disableWhileLoading={false} />
		</Stack>
	);
}

export const DisableWhileLoadingOptOut: Story = {
	render: () => <OptOutExample />,
};
