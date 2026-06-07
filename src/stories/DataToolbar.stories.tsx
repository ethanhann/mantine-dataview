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

function Example() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId: (p) => p.id,
		fetcher,
	});
	return (
		<Stack>
			<DataToolbar view={view} />
			{view.state.view === "cards" ? (
				<DataCards view={view} />
			) : (
				<DataTable view={view} withTableBorder />
			)}
		</Stack>
	);
}

export const Default: Story = { render: () => <Example /> };
