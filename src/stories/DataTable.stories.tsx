import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable } from "../components/DataTable";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

/** Table presentation. Renders rows in a Mantine Table with sortable headers, column pinning, and selection checkboxes. */
const meta: Meta<typeof DataTable> = {
	title: "Components/DataTable",
	component: DataTable,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataTable>;

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
