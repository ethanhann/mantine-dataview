// Bulk action bar. It is derived purely from `selection`, so it is identical no matter which
// view is active. The same selection state drives the table checkboxes and the card overlays.
// It renders nothing when nothing is selected. Consumer actions come from the `BulkActions` slot.
//
// Selection is scoped to a page in v1, so there is no select all across pages. `selection.ids`
// still spans every page the user has selected on, so actions can use the full id set even
// though only rows on the current page are materialized in `selection.rows`.

import { Button, Group, Paper, type PaperProps, Text } from "@mantine/core";
import type { UseDataViewReturn } from "../../types/options";
import { Slot } from "../Slot";
import type { DataViewSlots } from "../types";

export interface DataBulkActionsProps<TData>
	extends Omit<PaperProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
}

export function DataBulkActions<TData>({
	view,
	slots,
	...paperProps
}: DataBulkActionsProps<TData>) {
	const { selection, labels } = view;
	if (selection.count === 0) return null;

	return (
		<Paper
			withBorder
			p="xs"
			radius="sm"
			role="region"
			aria-label={labels.bulkActions}
			{...paperProps}
		>
			<Group justify="space-between" wrap="wrap" gap="sm">
				<Group gap="sm">
					<Text size="sm" fw={500} aria-live="polite">
						{labels.selectedCount(selection.count)}
					</Text>
					<Button variant="subtle" size="xs" onClick={selection.clear}>
						{labels.clearSelection}
					</Button>
				</Group>
				{slots?.BulkActions && (
					<Group gap="xs">
						<Slot render={slots.BulkActions} ctx={selection} />
					</Group>
				)}
			</Group>
		</Paper>
	);
}
