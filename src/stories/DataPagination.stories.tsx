import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataPagination } from "../components/DataPagination";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

/** Pagination controls showing page navigation and a page size selector. Reads `rowCount` and `pageSizeOptions` from the view. */
const meta: Meta<typeof DataPagination> = {
	title: "Components/DataPagination",
	component: DataPagination,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataPagination>;

function Example() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 10),
		rowCount: people.length,
		status: "success",
	});
	return <DataPagination view={view} />;
}

export const Default: Story = { render: () => <Example /> };
