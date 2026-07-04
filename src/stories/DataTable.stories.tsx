import { Button, Group, Stack, Table, Text } from "@mantine/core";
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

/**
 * Drag a header's right edge to resize the column; double-click the handle to reset it. Widths
 * live in `state.columnSizing` and persist through the preference adapter. Enabled with
 * `enableColumnResizing` on the hook.
 */
function ResizingExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 8),
		rowCount: people.length,
		status: "success",
		enableColumnResizing: true,
	});
	return (
		<Stack gap="sm">
			<Text size="sm" c="dimmed">
				Widths: {JSON.stringify(view.state.columnSizing)}
			</Text>
			<DataTable view={view} withTableBorder />
		</Stack>
	);
}

export const ColumnResizing: Story = { render: () => <ResizingExample /> };

/**
 * The `Row` slot wraps every data row. Spread the provided `rowProps` onto the element so the
 * custom row keeps roving focus, selection, and activation. Here suspended people get a tinted
 * row.
 */
function RowSlotExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 8),
		rowCount: people.length,
		status: "success",
	});
	return (
		<DataTable
			view={view}
			withTableBorder
			slots={{
				Row: ({ row, cells, rowProps }) => (
					<Table.Tr
						{...rowProps}
						style={{
							...(row.original.status === "suspended"
								? { background: "var(--mantine-color-red-light)" }
								: {}),
						}}
					>
						{cells}
					</Table.Tr>
				),
			}}
		/>
	);
}

export const RowSlot: Story = { render: () => <RowSlotExample /> };

/**
 * Single-select mode: `enableMultiRowSelection={false}` collapses selection to one row. The
 * checkboxes behave like radios, Space moves the single selection, and the selection API's
 * mutators keep only the last id.
 */
function SingleSelectExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 8),
		rowCount: people.length,
		status: "success",
		enableMultiRowSelection: false,
	});
	return (
		<Stack gap="sm">
			<Text size="sm">Selected: {view.selection.ids.join(", ") || "none"}</Text>
			<DataTable view={view} withTableBorder />
		</Stack>
	);
}

export const SingleSelect: Story = { render: () => <SingleSelectExample /> };
