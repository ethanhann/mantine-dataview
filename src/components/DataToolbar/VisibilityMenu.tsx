// Column visibility menu. Toggling a column hides both its table column and its card field,
// because the card composition reads visible columns. One control gives parity by design.

import { Button, Checkbox, Menu, Stack } from "@mantine/core";
import { resolveColumnLabel } from "../../core/cardComposition";
import type { UseDataViewReturn } from "../../types/options";
import { ChevronDownIcon } from "../icons";

export function VisibilityMenu<TData>({
	view,
}: {
	view: UseDataViewReturn<TData>;
}) {
	const columns = view.table.getAllLeafColumns().filter((c) => c.getCanHide());
	if (columns.length === 0) return null;

	return (
		<Menu closeOnItemClick={false} withinPortal position="bottom-end">
			<Menu.Target>
				<Button variant="default" rightSection={<ChevronDownIcon />}>
					Columns
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				<Stack gap="xs" p="xs">
					{columns.map((column) => (
						<Checkbox
							key={column.id}
							label={resolveColumnLabel(column)}
							checked={column.getIsVisible()}
							onChange={(e) => column.toggleVisibility(e.currentTarget.checked)}
						/>
					))}
				</Stack>
			</Menu.Dropdown>
		</Menu>
	);
}
