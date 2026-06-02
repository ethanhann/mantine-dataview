import { Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import { DataCards } from "../components/DataCards";
import { DataTable } from "../components/DataTable";
import { DataToolbar } from "../components/DataToolbar";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
import { columns, createMockFetcher, type Person } from "./data";

const meta: Meta = {
	title: "Components/DataToolbar",
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

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
