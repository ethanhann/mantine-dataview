import { Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DataCards } from "../components/DataCards";
import { useDataView } from "../core/state/useDataView";
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

/**
 * Keyboard navigation and the programmatic selection API. Focus a card (click it or Tab to it), then
 * use the arrow keys to move in two dimensions across the grid, Space to select, Shift and an arrow to
 * select a range, and Enter to activate. The buttons drive the same selection through `view.selection`.
 */
function KeyboardExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 6),
		rowCount: people.length,
		status: "success",
		defaultView: "cards",
	});
	const [activated, setActivated] = useState<Person | null>(null);
	const pageIds = view.table.getRowModel().rows.map((r) => r.id);

	return (
		<Stack gap="sm">
			<Text size="sm" c="dimmed">
				Focus a card, then Arrow keys move across the grid, Space selects, Shift
				and an arrow selects a range, and Enter activates.
			</Text>
			<Group gap="sm">
				<Button
					size="xs"
					variant="default"
					onClick={() => view.selection.set(pageIds)}
				>
					Select all
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
			<DataCards
				view={view}
				onCardActivate={(person) => setActivated(person)}
			/>
		</Stack>
	);
}

export const KeyboardAndSelection: Story = {
	render: () => <KeyboardExample />,
};

/**
 * The `Card` slot wraps the default composition in a custom shell while keeping the built-in
 * title/subtitle/badge/meta layout (unlike `renderCard`, which replaces the content entirely).
 * Here selected cards get a primary border.
 */
function CardSlotExample() {
	const view = useDataView<Person>({
		columns,
		getRowId: (p) => p.id,
		rows: people.slice(0, 6),
		rowCount: people.length,
		status: "success",
		defaultView: "cards",
	});
	return (
		<DataCards
			view={view}
			slots={{
				Card: ({ selected, children }) => (
					<div
						style={{
							padding: "var(--mantine-spacing-lg)",
							borderRadius: "var(--mantine-radius-md)",
							border: selected
								? "2px solid var(--mantine-primary-color-filled)"
								: "1px dashed var(--mantine-color-default-border)",
							position: "relative",
						}}
					>
						{children}
					</div>
				),
			}}
		/>
	);
}

export const CardSlot: Story = { render: () => <CardSlotExample /> };
