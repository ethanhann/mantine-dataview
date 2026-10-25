// Bulk action bar. It is derived purely from `selection`, so it is identical no matter which
// view is active. The same selection state drives the table checkboxes and the card overlays.
// With nothing selected only a hidden, persistent live region renders (so the first selection is
// announced). Consumer actions come from the `BulkActions` slot.
//
// The bar has two modes. The default mode is an inline `region` that sits in the page flow. The
// floating mode is a Mantine `ActionBar`, a `group` fixed to the viewport and rendered in a portal.
//
// Selection is scoped to a page in v1, so there is no select all across pages. `selection.ids`
// still spans every page the user has selected on, so actions can use the full id set even
// though only rows on the current page are materialized in `selection.rows`.

import {
	ActionBar,
	type ActionBarProps,
	Button,
	Group,
	Paper,
	type PaperProps,
	Text,
	VisuallyHidden,
} from "@mantine/core";
import { useRef } from "react";
import type { UseDataViewReturn } from "../../types/options";
import type { RowData } from "../../types/table";
import { Slot } from "../_shared/Slot";
import type { DataViewSlots } from "../_shared/types";

/**
 * Props for the floating bar. The library sets `opened`, `onClose`, `children` and the group name,
 * so they are not accepted here. Set the group name with the `bulkActions` label.
 */
export type FloatingBulkActionsProps = Omit<
	ActionBarProps,
	"opened" | "onClose" | "children" | "aria-label"
>;

export interface DataBulkActionsProps<TData extends RowData>
	extends Omit<PaperProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	/**
	 * Render the bar fixed to the viewport as a Mantine `ActionBar` instead of inline. Escape does not
	 * clear the selection unless `actionBarProps.closeOnEscape` is set, and the bar then listens on
	 * the whole window. Default: false.
	 */
	floating?: boolean;
	/** Props for the `ActionBar` in floating mode. The `PaperProps` apply to the inline bar only. */
	actionBarProps?: FloatingBulkActionsProps;
}

export function DataBulkActions<TData extends RowData>({
	view,
	slots,
	floating = false,
	actionBarProps,
	...paperProps
}: DataBulkActionsProps<TData>) {
	const { selection, labels } = view;
	// The floating bar stays on screen while it leaves, so it keeps showing the last real selection
	// instead of an empty one.
	const lastSelection = useRef(selection);
	if (selection.count > 0) lastSelection.current = selection;
	const shownSelection =
		selection.count > 0 ? selection : lastSelection.current;

	// The live region stays mounted even with nothing selected. Assistive technology only
	// announces content changes inside an existing region, so a region that mounts together with
	// its first message announces nothing.
	const announcement = (
		<VisuallyHidden aria-live="polite">
			{selection.count > 0 ? labels.selectedCount(selection.count) : ""}
		</VisuallyHidden>
	);

	if (floating) {
		return (
			<>
				{announcement}
				<ActionBar
					{...actionBarProps}
					opened={selection.count > 0}
					onClose={selection.clear}
					aria-label={labels.bulkActions}
				>
					<Text size="sm" fw={500}>
						{labels.selectedCount(shownSelection.count)}
					</Text>
					{slots?.BulkActions && (
						<>
							<ActionBar.Divider />
							<Slot render={slots.BulkActions} ctx={shownSelection} />
						</>
					)}
					<ActionBar.CloseButton aria-label={labels.clearSelection} />
				</ActionBar>
			</>
		);
	}

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
