import { Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { DataCards } from "../components/DataCards";
import { DataTable } from "../components/DataTable";
import { DataToolbar } from "../components/DataToolbar";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
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
