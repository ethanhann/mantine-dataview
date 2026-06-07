import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataCards } from "../components/DataCards";
import { useDataView } from "../core/useDataView";
import { columns, type Person, people } from "./data";

/** Card grid presentation. Renders each row as a Mantine Card using column meta roles (title, subtitle, badge, meta). */
const meta: Meta<typeof DataCards> = {
	title: "Components/DataCards",
	component: DataCards,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataCards>;

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
