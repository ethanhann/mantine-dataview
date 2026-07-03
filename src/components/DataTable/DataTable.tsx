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
import type { CSSProperties, ReactNode, SyntheticEvent } from "react";
import { useRowTransition } from "../../core/useRowTransition";
import type { UseDataViewReturn } from "../../types/options";
import { SortIcon } from "../icons";
import { Slot } from "../Slot";
import { EmptyContent, ErrorContent } from "../StateMessage";
import type { DataViewSlots } from "../types";
import { useGridNavigation } from "../useGridNavigation";
// @ts-expect-error CSS import has no type declarations
import "../grid.css";
// @ts-expect-error CSS import has no type declarations
import "./transitions.css";

/** Width of the leading selection checkbox column, shared by header and body cells. */
const SELECTION_COLUMN_WIDTH = 40;

function pinningStyle<TData>(
	column: Column<TData>,
	selected?: boolean,
): CSSProperties | undefined {
	const pinned = column.getIsPinned();
	if (!pinned) return undefined;
	return {
		position: "sticky",
		[pinned]:
			pinned === "left" ? column.getStart("left") : column.getAfter("right"),
		zIndex: 1,
		// A pinned cell needs an opaque background to mask the content scrolling behind it, which would
		// otherwise hide the selected-row tint that the stylesheet paints on ordinary cells. Layer the
		// same tint over the opaque body color so the selected state carries across pinned cells too.
		backgroundColor: "var(--mantine-color-body)",
		...(selected
			? {
					backgroundImage:
						"linear-gradient(var(--mantine-primary-color-light), var(--mantine-primary-color-light))",
				}
			: {}),
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
	/**
	 * Arrow-key navigation over rows with Space to select and Shift+Arrow to range-select, exposed as
	 * a `role="grid"`. Default: true. Set false to embed the table in your own keyboard model.
	 */
	keyboardNavigation?: boolean;
	/**
	 * Activate a row with Enter or a single click on its body. Receives the typed row. Clicks on the
	 * checkbox, links, or buttons in the row, or while selecting text, do not activate. Requires
	 * `keyboardNavigation` (the default).
	 */
	onRowActivate?: (row: TData, event: SyntheticEvent) => void;
}

export function DataTable<TData>({
	view,
	slots,
	enableSelection,
	loadingRowCount,
	disableWhileLoading = true,
	animateRows = false,
	keyboardNavigation = true,
	onRowActivate,
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

	// aria-rowcount/aria-rowindex describe the full paginated set. The header row is row 1, so the count
	// includes it and the first body row on the page is offset past both the header and prior pages.
	const headerRowCount = table.getHeaderGroups().length;
	const { pageIndex, pageSize } = table.getState().pagination;

	const nav = useGridNavigation({
		enabled: keyboardNavigation,
		selectable: selectionEnabled,
		multiSelectable: table.options.enableMultiRowSelection !== false,
		ids: transition.rows.map((r) => r.id),
		rowCount: table.getRowCount() + headerRowCount,
		rowIndexBase: headerRowCount + pageIndex * pageSize + 1,
		selection: view.selection,
		canSelectItem: (index) => transition.rows[index]?.getCanSelect() ?? false,
		onActivate: onRowActivate
			? (index, event) => {
					const row = transition.rows[index];
					if (row) onRowActivate(row.original, event);
				}
			: undefined,
	});
	const cellRole = keyboardNavigation ? "gridcell" : undefined;

	const renderDataRows = (rowsToRender: typeof transition.rows): ReactNode => (
		<Table.Tbody
			key={transition.generation}
			data-changed={animateRows || undefined}
		>
			{rowsToRender.map((row, index) => {
				const isEntering = transition.entering.has(row.id) || undefined;
				const cells = (
					<>
						{selectionEnabled && (
							<Table.Td
								role={cellRole}
								style={{ width: SELECTION_COLUMN_WIDTH }}
							>
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
									role={cellRole}
									style={{
										...pinningStyle(cell.column, row.getIsSelected()),
										...(align ? { textAlign: align } : undefined),
									}}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</Table.Td>
							);
						})}
					</>
				);
				const itemProps = nav.getItemProps(
					index,
					row.getIsSelected(),
					row.getCanSelect(),
				);
				return slots?.Row ? (
					<Slot
						key={row.id}
						render={slots.Row}
						ctx={{ row, cells, rowProps: itemProps }}
					/>
				) : (
					<Table.Tr
						key={row.id}
						className="dataviewItem"
						data-selected={row.getIsSelected() || undefined}
						data-entering={isEntering}
						{...itemProps}
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
			<Table layout="fixed" {...nav.containerProps} {...tableProps}>
				<Table.Thead>
					{table.getHeaderGroups().map((group, groupIndex) => (
						<Table.Tr
							key={group.id}
							aria-rowindex={keyboardNavigation ? groupIndex + 1 : undefined}
						>
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
							role="img"
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
