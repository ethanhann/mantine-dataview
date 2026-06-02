import type { Meta, StoryObj } from "@storybook/react";
import { DataPagination } from "../components/DataPagination";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

const meta: Meta = {
	title: "Components/DataPagination",
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

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
