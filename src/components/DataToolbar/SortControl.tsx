// Sort control. It is a Select of sortable columns plus a direction toggle. It drives the same
// `sorting` state the table headers do, so cards, which have no headers, sort the same way.
//
// NOTE: this control models a single sort key. It reads `sorting[0]` and replaces the whole sort
// array on change, so if a multi-column sort was set via the table headers, interacting with this
// control collapses it to the one chosen column. Multi-sort remains available through the headers.

import { ActionIcon, Group, Select } from "@mantine/core";
import { resolveColumnLabel } from "../../core/cardComposition";
import type { UseDataViewReturn } from "../../types/options";
import { SortIcon } from "../icons";

export function SortControl<TData>({
	view,
	disabled,
}: {
	view: UseDataViewReturn<TData>;
	disabled?: boolean;
}) {
	const { sortableColumns, state, table } = view;
	const primary = state.sorting[0];
	const data = sortableColumns.map((c) => ({
		value: c.id,
		label: resolveColumnLabel(c),
	}));

	return (
		<Group gap={4} wrap="nowrap">
			<Select
				aria-label="Sort by"
				placeholder="Sort by"
				clearable
				disabled={disabled}
				data={data}
				value={primary?.id ?? null}
				onChange={(id) =>
					table.setSorting(id ? [{ id, desc: primary?.desc ?? false }] : [])
				}
			/>
			<ActionIcon
				aria-label="Toggle sort direction"
				variant="default"
				size="lg"
				disabled={disabled || !primary}
				onClick={() =>
					primary && table.setSorting([{ id: primary.id, desc: !primary.desc }])
				}
			>
				<SortIcon
					direction={primary ? (primary.desc ? "desc" : "asc") : false}
				/>
			</ActionIcon>
		</Group>
	);
}
