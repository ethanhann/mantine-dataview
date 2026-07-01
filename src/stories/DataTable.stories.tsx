import { Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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

/**
 * Keyboard navigation and the programmatic selection API. Focus a row (click it or Tab to it), then
 * use the arrow keys to move, Space to select, Shift and an arrow to select a range, and Enter to
 * activate. The buttons drive the same selection through `view.selection`.
 */
function KeyboardExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 8),
		rowCount: people.length,
		status: "success",
	});
	const [activated, setActivated] = useState<Person | null>(null);
	const pageIds = view.table.getRowModel().rows.map((r) => r.id);

	return (
		<Stack gap="sm">
			<Text size="sm" c="dimmed">
				Focus a row, then Arrow keys move, Space selects, Shift and an arrow
				selects a range, and Enter activates.
			</Text>
			<Group gap="sm">
				<Button
					size="xs"
					variant="default"
					onClick={() => pageIds[0] && view.selection.select(pageIds[0])}
				>
					Select first
				</Button>
				<Button
					size="xs"
					variant="default"
					onClick={() => view.selection.set(pageIds)}
				>
					Select page
				</Button>
				<Button
					size="xs"
					variant="default"
					onClick={() => view.selection.clear()}
				>
					Clear
				</Button>
				<Text size="sm">Selected: {view.selection.count}</Text>
				{activated && <Text size="sm">Activated: {activated.name}</Text>}
			</Group>
			<DataTable
				view={view}
				striped
				highlightOnHover
				withTableBorder
				onRowActivate={(person) => setActivated(person)}
			/>
		</Stack>
	);
}

export const KeyboardAndSelection: Story = {
	render: () => <KeyboardExample />,
};
