// Pagination. This single pager is shared by both presentations. It reads `pagination` state
// and `rowCount` from the core, so the table and cards page in lockstep. Page math comes from
// the v8 instance through `getPageCount` and `getRowCount`, which derive it from `rowCount`.

import {
	Group,
	type GroupProps,
	Pagination,
	Select,
	Text,
} from "@mantine/core";
import type { UseDataViewReturn } from "../../types/options";

export interface DataPaginationProps<TData>
	extends Omit<GroupProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	/** Override the page size choices. It defaults to the core's `pageSizeOptions`. */
	pageSizeOptions?: number[];
	showPageSize?: boolean;
	/** Show the range summary, such as "1 to 10 of 42". It defaults to true. */
	showRange?: boolean;
	pageSizeLabel?: string;
}

export function DataPagination<TData>({
	view,
	pageSizeOptions,
	showPageSize = true,
	showRange = true,
	pageSizeLabel = "Rows per page",
	...groupProps
}: DataPaginationProps<TData>) {
	const { table } = view;
	const { pageIndex, pageSize } = view.state.pagination;
	const total = table.getRowCount();
	const pageCount = table.getPageCount();
	const sizes = pageSizeOptions ?? view.pageSizeOptions;

	// Always include the active page size so the Select never shows an empty value when the current
	// size isn't one of the configured options.
	const sizeData = Array.from(new Set([...sizes, pageSize]))
		.sort((a, b) => a - b)
		.map(String);

	// Clamp the range so a stale, over-range page (e.g. after the row count shrank) can never read
	// "41–30 of 30".
	const start = total === 0 ? 0 : Math.min(pageIndex * pageSize + 1, total);
	const end = Math.min((pageIndex + 1) * pageSize, total);

	return (
		<Group justify="space-between" wrap="wrap" gap="sm" {...groupProps}>
			<Group gap="sm" wrap="wrap">
				{showPageSize && (
					<Select
						aria-label={pageSizeLabel}
						data={sizeData}
						value={String(pageSize)}
						onChange={(v) => {
							const next = Number(v);
							if (Number.isFinite(next)) table.setPageSize(next);
						}}
						w={80}
						comboboxProps={{ withinPortal: true }}
					/>
				)}
				{showRange && (
					<Text size="sm" c="dimmed">
						{start}–{end} of {total}
					</Text>
				)}
			</Group>
			{/* A single page (or none) needs no navigation control. */}
			{pageCount > 1 && (
				<Pagination
					value={pageIndex + 1}
					total={pageCount}
					onChange={(page) => table.setPageIndex(page - 1)}
					getControlProps={(control) => ({ "aria-label": `${control} page` })}
				/>
			)}
		</Group>
	);
}
