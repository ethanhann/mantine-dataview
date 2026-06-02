// Table presentation. It is a thin projection of the `useDataView` return. It owns no feature
// state, only how that state is shown. Sorting, selection, visibility, and the four data states
// all read straight from the core.

import {
	Center,
	Checkbox,
	Skeleton,
	Table,
	type TableProps,
	UnstyledButton,
} from "@mantine/core";
import { type Column, flexRender, type Header } from "@tanstack/react-table";
import type { CSSProperties, ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";
import { SortIcon } from "../icons";
import { EmptyContent, ErrorContent } from "../StateMessage";
import type { DataViewSlots } from "../types";

function pinningStyle<TData>(column: Column<TData>): CSSProperties | undefined {
	const pinned = column.getIsPinned();
	if (!pinned) return undefined;
	return {
		position: "sticky",
		[pinned]:
			pinned === "left" ? column.getStart("left") : column.getAfter("right"),
		zIndex: 1,
		backgroundColor: "var(--mantine-color-body)",
	};
}

export interface DataTableProps<TData>
	extends Omit<TableProps, "data" | "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	/** Whether to render the leading selection checkbox column. It defaults to the core setting. */
	enableSelection?: boolean;
	/** Skeleton rows shown while loading. It defaults to the current page size, capped at 8. */
	loadingRowCount?: number;
}

export function DataTable<TData>({
	view,
	slots,
	enableSelection,
	loadingRowCount,
	...tableProps
}: DataTableProps<TData>) {
	const { table, renderStatus } = view;
	const leafColumns = table.getVisibleLeafColumns();
	const selectionEnabled =
		enableSelection ?? table.options.enableRowSelection !== false;
	const colCount = leafColumns.length + (selectionEnabled ? 1 : 0);
	const skeletonRows =
		loadingRowCount ?? Math.min(view.state.pagination.pageSize, 8);

	const renderBody = (): ReactNode => {
		switch (renderStatus.phase) {
			case "loading":
				return slots?.LoadingTable ? (
					slots.LoadingTable()
				) : (
					<Table.Tbody>
						{Array.from({ length: skeletonRows }, (_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows of a fixed count
							<Table.Tr key={i}>
								{selectionEnabled && (
									<Table.Td>
										<Skeleton height={16} width={16} />
									</Table.Td>
								)}
								{leafColumns.map((col) => (
									<Table.Td key={col.id}>
										<Skeleton height={12} />
									</Table.Td>
								))}
							</Table.Tr>
						))}
					</Table.Tbody>
				);
			case "error":
				return (
					<MessageBody colSpan={colCount}>
						<ErrorContent view={view} slots={slots} />
					</MessageBody>
				);
			case "empty":
			case "empty-filtered":
				return (
					<MessageBody colSpan={colCount}>
						<EmptyContent view={view} slots={slots} />
					</MessageBody>
				);
			default:
				return (
					<Table.Tbody>
						{table.getRowModel().rows.map((row) => {
							const cells = (
								<>
									{selectionEnabled && (
										<Table.Td>
											<Checkbox
												aria-label="Select row"
												checked={row.getIsSelected()}
												disabled={!row.getCanSelect()}
												indeterminate={row.getIsSomeSelected()}
												onChange={row.getToggleSelectedHandler()}
											/>
										</Table.Td>
									)}
									{row.getVisibleCells().map((cell) => {
										const align = cell.column.columnDef.meta?.align;
										return (
											<Table.Td
												key={cell.id}
												style={{
													...pinningStyle(cell.column),
													...(align ? { textAlign: align } : undefined),
												}}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</Table.Td>
										);
									})}
								</>
							);
							return slots?.Row ? (
								<RowKey key={row.id}>{slots.Row({ row, cells })}</RowKey>
							) : (
								<Table.Tr
									key={row.id}
									data-selected={row.getIsSelected() || undefined}
								>
									{cells}
								</Table.Tr>
							);
						})}
					</Table.Tbody>
				);
		}
	};

	const hasPinning = table.getIsSomeColumnsPinned();

	return (
		<div style={hasPinning ? { overflowX: "auto" } : undefined}>
			<Table layout="fixed" {...tableProps}>
				<Table.Thead>
					{table.getHeaderGroups().map((group) => (
						<Table.Tr key={group.id}>
							{selectionEnabled && (
								<Table.Th style={{ width: 40 }}>
									<Checkbox
										aria-label="Select all rows on this page"
										checked={table.getIsAllPageRowsSelected()}
										indeterminate={
											table.getIsSomePageRowsSelected() &&
											!table.getIsAllPageRowsSelected()
										}
										onChange={table.getToggleAllPageRowsSelectedHandler()}
									/>
								</Table.Th>
							)}
							{group.headers.map((header) => (
								<HeaderCell key={header.id} header={header} />
							))}
						</Table.Tr>
					))}
				</Table.Thead>
				{renderBody()}
			</Table>
		</div>
	);
}

/** Wrapper that carries the React key for a Row slot element the consumer supplies. */
function RowKey({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

function MessageBody({
	colSpan,
	children,
}: {
	colSpan: number;
	children: ReactNode;
}) {
	return (
		<Table.Tbody>
			<Table.Tr>
				<Table.Td colSpan={colSpan}>
					<Center p="xl">{children}</Center>
				</Table.Td>
			</Table.Tr>
		</Table.Tbody>
	);
}

function HeaderCell<TData>({ header }: { header: Header<TData, unknown> }) {
	const { column } = header;
	const align = column.columnDef.meta?.align;
	const sorted = column.getIsSorted();
	const sortIndex = column.getSortIndex();
	const multiSorted = sortIndex > 0;
	const content = header.isPlaceholder
		? null
		: flexRender(column.columnDef.header, header.getContext());

	return (
		<Table.Th
			style={{
				...pinningStyle(column),
				...(align ? { textAlign: align } : undefined),
			}}
			aria-sort={
				sorted === "asc"
					? "ascending"
					: sorted === "desc"
						? "descending"
						: undefined
			}
		>
			{column.getCanSort() ? (
				<UnstyledButton
					onClick={column.getToggleSortingHandler()}
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						font: "inherit",
					}}
				>
					{content}
					<SortIcon direction={sorted} />
					{multiSorted && (
						<span
							role="note"
							style={{ fontSize: "0.7em", opacity: 0.6 }}
							aria-label={`Sort priority ${sortIndex + 1}`}
						>
							{sortIndex + 1}
						</span>
					)}
				</UnstyledButton>
			) : (
				content
			)}
		</Table.Th>
	);
}
