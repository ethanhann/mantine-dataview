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
import { useRowTransition } from "../../core/useRowTransition";
import type { UseDataViewReturn } from "../../types/options";
import { SortIcon } from "../icons";
import { Slot } from "../Slot";
import { EmptyContent, ErrorContent } from "../StateMessage";
import type { DataViewSlots } from "../types";
// @ts-expect-error CSS import has no type declarations
import "./transitions.css";

/** Width of the leading selection checkbox column, shared by header and body cells. */
const SELECTION_COLUMN_WIDTH = 40;

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
	/** Disable sorting interactions while data is loading. Default: true. */
	disableWhileLoading?: boolean;
	/**
	 * Animate row enter/exit instead of showing skeletons. Default: false. Note: enabling this
	 * remounts the table body on every data/order change to restart the CSS animation, which resets
	 * per-cell focus and any cell-local component state on each sort/page/filter.
	 */
	animateRows?: boolean;
}

export function DataTable<TData>({
	view,
	slots,
	enableSelection,
	loadingRowCount,
	disableWhileLoading = true,
	animateRows = false,
	...tableProps
}: DataTableProps<TData>) {
	const { table, renderStatus } = view;
	const interactionDisabled = disableWhileLoading && view.status === "loading";
	const transition = useRowTransition(table.getRowModel().rows, animateRows);
	const leafColumns = table.getVisibleLeafColumns();
	const selectionEnabled =
		enableSelection ?? table.options.enableRowSelection !== false;
	const colCount = leafColumns.length + (selectionEnabled ? 1 : 0);
	const skeletonRows =
		loadingRowCount ?? Math.min(view.state.pagination.pageSize, 8);

	const renderDataRows = (rowsToRender: typeof transition.rows): ReactNode => (
		<Table.Tbody
			key={transition.generation}
			data-changed={animateRows || undefined}
		>
			{rowsToRender.map((row) => {
				const isEntering = transition.entering.has(row.id) || undefined;
				const cells = (
					<>
						{selectionEnabled && (
							<Table.Td style={{ width: SELECTION_COLUMN_WIDTH }}>
								<Checkbox
									aria-label="Select row"
									checked={row.getIsSelected()}
									disabled={!row.getCanSelect()}
									// Only sub-row-bearing rows can be partially selected; a leaf row that
									// is both checked and indeterminate is contradictory.
									indeterminate={
										row.subRows.length > 0 && row.getIsSomeSelected()
									}
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
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</Table.Td>
							);
						})}
					</>
				);
				return slots?.Row ? (
					<Slot key={row.id} render={slots.Row} ctx={{ row, cells }} />
				) : (
					<Table.Tr
						key={row.id}
						data-selected={row.getIsSelected() || undefined}
						data-entering={isEntering}
					>
						{cells}
					</Table.Tr>
				);
			})}
		</Table.Tbody>
	);

	const renderBody = (): ReactNode => {
		if (
			animateRows &&
			renderStatus.phase === "loading" &&
			transition.rows.length > 0
		) {
			return renderDataRows(transition.rows);
		}

		switch (renderStatus.phase) {
			case "loading":
				return slots?.LoadingTable ? (
					<Slot render={slots.LoadingTable} ctx={undefined} />
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
				return renderDataRows(transition.rows);
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
								<Table.Th style={{ width: SELECTION_COLUMN_WIDTH }}>
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
								<HeaderCell
									key={header.id}
									header={header}
									disabled={interactionDisabled}
								/>
							))}
						</Table.Tr>
					))}
				</Table.Thead>
				{renderBody()}
			</Table>
		</div>
	);
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

// NOTE: deliberately NOT wrapped in `memo`. TanStack reuses header objects across sorting-state
// changes (headers only rebuild on column visibility/pinning/order changes), so memoizing on the
// `header` prop would drop reactivity to derived sort state (`aria-sort` would go stale).
function HeaderCell<TData>({
	header,
	disabled,
}: {
	header: Header<TData, unknown>;
	disabled?: boolean;
}) {
	const { column } = header;
	const align = column.columnDef.meta?.align;
	const sorted = column.getIsSorted();
	const sortIndex = column.getSortIndex();
	const multiSorted = sortIndex > 0;
	const content = header.isPlaceholder
		? null
		: flexRender(column.columnDef.header, header.getContext());
	const sortable = column.getCanSort() && !disabled;
	const headerText =
		typeof column.columnDef.header === "string"
			? column.columnDef.header
			: column.id;

	const colSize = column.columnDef.size;

	return (
		<Table.Th
			style={{
				...pinningStyle(column),
				...(align ? { textAlign: align } : undefined),
				...(colSize != null ? { width: colSize } : undefined),
			}}
			aria-sort={
				sorted === "asc"
					? "ascending"
					: sorted === "desc"
						? "descending"
						: undefined
			}
		>
			{sortable ? (
				<UnstyledButton
					type="button"
					aria-label={`Sort by ${headerText}`}
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
							style={{ fontSize: "0.7em", opacity: 0.6 }}
							aria-label={`sort priority ${sortIndex + 1}`}
						>
							{sortIndex + 1}
						</span>
					)}
				</UnstyledButton>
			) : (
				<span
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						...(disabled ? { opacity: 0.5 } : {}),
					}}
				>
					{content}
					{sorted && <SortIcon direction={sorted} />}
				</span>
			)}
		</Table.Th>
	);
}
