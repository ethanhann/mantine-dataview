// Orchestrator. `<DataViewer view={dv}>` provides context and a default vertical layout. The
// compound parts, `DataViewer.Toolbar`, `.BulkActions`, `.Body`, and `.Pagination`, project the
// shared state. With no children it renders the full default layout. Pass children to compose
// your own.

import { Stack, type StackProps } from "@mantine/core";
import { type ReactNode, useMemo } from "react";
import type { UseDataViewReturn } from "../../types/options";
import { DataBulkActions, type DataBulkActionsProps } from "../DataBulkActions";
import { DataCards, type DataCardsProps } from "../DataCards";
import { DataPagination, type DataPaginationProps } from "../DataPagination";
import { DataTable, type DataTableProps } from "../DataTable";
import { DataToolbar, type DataToolbarProps } from "../DataToolbar";
import type { DataViewSlots } from "../types";
import {
	type DataViewContextValue,
	DataViewProvider,
	useDataViewContext,
} from "./context";

export interface DataViewerProps<TData> extends Omit<StackProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	renderCard?: DataCardsProps<TData>["renderCard"];
	fallbackRole?: DataCardsProps<TData>["fallbackRole"];
	lockSwitcherOnMobile?: boolean;
	/** Animate row enter/exit instead of showing skeletons. Default: false. */
	animateRows?: boolean;
	/** Custom composition. It defaults to Toolbar, BulkActions, Body, and Pagination. */
	children?: ReactNode;
}

export function DataViewer<TData>({
	view,
	slots,
	renderCard,
	fallbackRole,
	lockSwitcherOnMobile,
	animateRows,
	children,
	...stackProps
}: DataViewerProps<TData>) {
	const ctx = useMemo<DataViewContextValue<TData>>(
		() => ({
			view,
			slots,
			renderCard,
			fallbackRole,
			lockSwitcherOnMobile,
			animateRows,
		}),
		[view, slots, renderCard, fallbackRole, lockSwitcherOnMobile, animateRows],
	);

	return (
		<DataViewProvider value={ctx as DataViewContextValue<unknown>}>
			<Stack {...stackProps}>
				{children ?? (
					<>
						<DataViewToolbar />
						<DataViewBulkActions />
						<DataViewBody />
						<DataViewPagination />
					</>
				)}
			</Stack>
		</DataViewProvider>
	);
}

export type DataViewerToolbarProps<TData> = Omit<DataToolbarProps<TData>, "view">;

function DataViewToolbar<TData>(props: DataViewerToolbarProps<TData>) {
	const { view, lockSwitcherOnMobile } = useDataViewContext<TData>();
	return (
		<DataToolbar
			view={view}
			lockSwitcherOnMobile={lockSwitcherOnMobile}
			{...props}
		/>
	);
}

export interface DataViewerBodyProps<TData> {
	tableProps?: Omit<DataTableProps<TData>, "view" | "slots">;
	cardsProps?: Omit<
		DataCardsProps<TData>,
		"view" | "slots" | "renderCard" | "fallbackRole"
	>;
}

function DataViewBody<TData>({
	tableProps,
	cardsProps,
}: DataViewerBodyProps<TData>) {
	const { view, slots, renderCard, fallbackRole, animateRows } =
		useDataViewContext<TData>();
	return view.view === "cards" ? (
		<DataCards
			view={view}
			slots={slots}
			renderCard={renderCard}
			fallbackRole={fallbackRole}
			animateRows={animateRows}
			{...cardsProps}
		/>
	) : (
		<DataTable
			view={view}
			slots={slots}
			animateRows={animateRows}
			{...tableProps}
		/>
	);
}

function DataViewPagination<TData>(
	props: Omit<DataPaginationProps<TData>, "view">,
) {
	const { view } = useDataViewContext<TData>();
	return <DataPagination view={view} {...props} />;
}

function DataViewBulkActions<TData>(
	props: Omit<DataBulkActionsProps<TData>, "view" | "slots">,
) {
	const { view, slots } = useDataViewContext<TData>();
	return <DataBulkActions view={view} slots={slots} {...props} />;
}

DataViewer.Toolbar = DataViewToolbar;
DataViewer.BulkActions = DataViewBulkActions;
DataViewer.Body = DataViewBody;
DataViewer.Pagination = DataViewPagination;
