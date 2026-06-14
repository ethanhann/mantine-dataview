// Column visibility and pinning menu. Toggling a column hides both its table column and its
// card field. Pin controls let users freeze columns to the left or right edge of the table.

import {
	ActionIcon,
	Button,
	Checkbox,
	Group,
	Menu,
	Stack,
} from "@mantine/core";
import type { Column } from "@tanstack/react-table";
import { resolveColumnLabel } from "../../core/cardComposition";
import type { UseDataViewReturn } from "../../types/options";
import { ChevronDownIcon, PinLeftIcon, PinRightIcon } from "../icons";

function PinControls<TData>({ column }: { column: Column<TData> }) {
	if (!column.getCanPin()) return null;
	const pinned = column.getIsPinned();
	return (
		<Group gap={2}>
			<ActionIcon
				size="xs"
				variant={pinned === "left" ? "filled" : "subtle"}
				color={pinned === "left" ? "blue" : "gray"}
				aria-label={`Pin ${resolveColumnLabel(column)} left`}
				onClick={() => column.pin(pinned === "left" ? false : "left")}
			>
				<PinLeftIcon />
			</ActionIcon>
			<ActionIcon
				size="xs"
				variant={pinned === "right" ? "filled" : "subtle"}
				color={pinned === "right" ? "blue" : "gray"}
				aria-label={`Pin ${resolveColumnLabel(column)} right`}
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
	const columns = view.table.getAllLeafColumns().filter((c) => c.getCanHide());
	if (columns.length === 0) return null;

	return (
		<Menu closeOnItemClick={false} withinPortal position="bottom-end">
			<Menu.Target>
				<Button
					variant="default"
					rightSection={<ChevronDownIcon />}
					disabled={disabled}
				>
					Columns
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				<Stack gap="xs" p="xs">
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
							<PinControls column={column} />
						</Group>
					))}
				</Stack>
			</Menu.Dropdown>
		</Menu>
	);
}
