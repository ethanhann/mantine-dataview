// Bulk action bar. It is derived purely from `selection`, so it is identical no matter which
// view is active. The same selection state drives the table checkboxes and the card overlays.
// With nothing selected only a hidden, persistent live region renders (so the first selection is
// announced). Consumer actions come from the `BulkActions` slot.
//
// Selection is scoped to a page in v1, so there is no select all across pages. `selection.ids`
// still spans every page the user has selected on, so actions can use the full id set even
// though only rows on the current page are materialized in `selection.rows`.

import {
	Button,
	Group,
	Paper,
	type PaperProps,
	Text,
	VisuallyHidden,
} from "@mantine/core";
import type { UseDataViewReturn } from "../../types/options";
import { Slot } from "../_shared/Slot";
import type { DataViewSlots } from "../_shared/types";

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

	// The live region stays mounted even with nothing selected. Assistive technology only
	// announces content changes inside an existing region, so a region that mounts together with
	// its first message announces nothing.
	const announcement = (
		<VisuallyHidden aria-live="polite">
			{selection.count > 0 ? labels.selectedCount(selection.count) : ""}
		</VisuallyHidden>
	);

	if (selection.count === 0) return announcement;

	return (
		<>
			{announcement}
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
						<Text size="sm" fw={500}>
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
		</>
	);
}
