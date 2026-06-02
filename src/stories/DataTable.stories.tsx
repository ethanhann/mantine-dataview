import type { Meta, StoryObj } from "@storybook/react";
import { DataTable } from "../components/DataTable";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

const meta: Meta = {
	title: "Components/DataTable",
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

function Example({ status }: { status?: "success" | "loading" | "error" }) {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: status === "success" || !status ? people.slice(0, 8) : [],
		rowCount: people.length,
		status: status ?? "success",
	});
	return <DataTable view={view} striped highlightOnHover withTableBorder />;
}

export const Default: Story = { render: () => <Example /> };
export const Loading: Story = { render: () => <Example status="loading" /> };
export const ErrorState: Story = { render: () => <Example status="error" /> };
