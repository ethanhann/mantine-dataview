import type { Meta, StoryObj } from "@storybook/react";
import { DataCards } from "../components/DataCards";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

const meta: Meta = {
	title: "Components/DataCards",
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

function Example({ status }: { status?: "success" | "loading" }) {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: status === "loading" ? [] : people.slice(0, 6),
		rowCount: people.length,
		status: status ?? "success",
		defaultView: "cards",
	});
	return <DataCards view={view} />;
}

export const Default: Story = { render: () => <Example /> };
export const Loading: Story = { render: () => <Example status="loading" /> };
