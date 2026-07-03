// Column visibility and pinning menu. Toggling a column hides both its table column and its
// card field. Pin controls let users freeze columns to the left or right edge of the table.
// A Popover with a labeled checkbox group, not a Mantine Menu: `role="menu"` may only contain
// menu items, and these are checkboxes and pin buttons.

import {
	ActionIcon,
	Button,
	Checkbox,
	Group,
	Popover,
	Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { Column } from "@tanstack/react-table";
import { resolveColumnLabel } from "../../core/cardComposition";
import type { DataViewLabels } from "../../types/labels";
import type { UseDataViewReturn } from "../../types/options";
import { ChevronDownIcon, PinLeftIcon, PinRightIcon } from "../icons";

function PinControls<TData>({
	column,
	labels,
}: {
	column: Column<TData>;
	labels: DataViewLabels;
}) {
	if (!column.getCanPin()) return null;
	const pinned = column.getIsPinned();
	return (
		<Group gap={2}>
			<ActionIcon
				size="xs"
				variant={pinned === "left" ? "filled" : "subtle"}
				color={pinned === "left" ? "blue" : "gray"}
				aria-label={labels.pinColumnLeft(resolveColumnLabel(column))}
				onClick={() => column.pin(pinned === "left" ? false : "left")}
			>
				<PinLeftIcon />
			</ActionIcon>
			<ActionIcon
				size="xs"
				variant={pinned === "right" ? "filled" : "subtle"}
				color={pinned === "right" ? "blue" : "gray"}
				aria-label={labels.pinColumnRight(resolveColumnLabel(column))}
				onClick={() => column.pin(pinned === "right" ? false : "right")}
			>
				<PinRightIcon />
			</ActionIcon>
		</Group>
	);
}

export function VisibilityMenu<TData>({
	view,
	disabled,
}: {
	view: UseDataViewReturn<TData>;
	disabled?: boolean;
}) {
	const { labels } = view;
	const [opened, { open, close }] = useDisclosure(false);
	const columns = view.table.getAllLeafColumns().filter((c) => c.getCanHide());
	if (columns.length === 0) return null;

	return (
		<Popover
			position="bottom-end"
			opened={opened}
			onChange={(o) => (o ? open() : close())}
			trapFocus
			withinPortal
		>
			<Popover.Target>
				<Button
					variant="default"
					rightSection={<ChevronDownIcon />}
					disabled={disabled}
					aria-haspopup="dialog"
					aria-expanded={opened}
					onClick={() => (opened ? close() : open())}
				>
					{labels.columns}
				</Button>
			</Popover.Target>
			<Popover.Dropdown>
				<Stack gap="xs" role="group" aria-label={labels.columns}>
					{columns.map((column) => (
						<Group
							key={column.id}
							gap="xs"
							justify="space-between"
							wrap="nowrap"
						>
							<Checkbox
								label={resolveColumnLabel(column)}
								checked={column.getIsVisible()}
								onChange={(e) =>
									column.toggleVisibility(e.currentTarget.checked)
								}
							/>
							<PinControls column={column} labels={labels} />
						</Group>
					))}
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
}
