// Orchestrator. `<DataViewer view={dv}>` provides context and a default vertical layout. The
// compound parts, `DataViewer.Toolbar`, `.BulkActions`, `.Body`, and `.Pagination`, project the
// shared state. With no children it renders the full default layout. Pass children to compose
// your own.

import { Stack, type StackProps } from "@mantine/core";
import type { ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";
import type { RowData } from "../../types/table";
import { Slot } from "../_shared/Slot";
import type { DataViewSlots, RegisteredView } from "../_shared/types";
import { DataBulkActions, type DataBulkActionsProps } from "../DataBulkActions";
import { DataCards, type DataCardsProps } from "../DataCards";
import { DataPagination, type DataPaginationProps } from "../DataPagination";
import { DataTable, type DataTableProps } from "../DataTable";
import { DataToolbar, type DataToolbarProps } from "../DataToolbar";
import {
	type DataViewContextValue,
	DataViewProvider,
	useDataViewContext,
} from "./context";

export interface DataViewerProps<TData extends RowData>
	extends Omit<StackProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	renderCard?: DataCardsProps<TData>["renderCard"];
	fallbackRole?: DataCardsProps<TData>["fallbackRole"];
	lockSwitcherOnMobile?: boolean;
	/** Animate row enter/exit instead of showing skeletons. Default: false. */
	animateRows?: boolean;
	/**
	 * Opt-in presentations beyond the built-in table and cards. Each adds a view-switcher option and
	 * renders its own body when active. Use `scheduleView()` from the `/schedule` subpath, e.g.
	 * `views={[scheduleView({ toEvent })]}`. With no `views` the component behaves exactly as before.
	 */
	views?: RegisteredView<TData>[];
	/**
	 * Props for the default bulk action bar. For example `{ floating: true }` renders it as a floating
	 * `ActionBar`. With custom `children`, pass the props to `<DataViewer.BulkActions />` instead.
	 */
	bulkActionsProps?: Omit<DataBulkActionsProps<TData>, "view" | "slots">;
	/**
	 * Custom composition. It defaults to Toolbar, BulkActions, Body, and Pagination. To pass
	 * `tableProps`/`cardsProps` to the body or props to the pagination, compose manually with the
	 * compound parts, e.g. `<DataViewer.Body tableProps={...} />` — these aren't exposed on the
	 * default layout.
	 */
	children?: ReactNode;
}

export function DataViewer<TData extends RowData>({
	view,
	slots,
	renderCard,
	fallbackRole,
	lockSwitcherOnMobile,
	animateRows,
	views,
	bulkActionsProps,
	children,
	...stackProps
}: DataViewerProps<TData>) {
	// Not memoized on purpose: `view` is a fresh object on every render of the hook owner (it carries
	// per-render derived state), so the context value necessarily changes each render regardless of
	// the other props. A `useMemo` here would only add overhead and a false sense of stability.
	const ctx: DataViewContextValue<TData> = {
		view,
		slots,
		renderCard,
		fallbackRole,
		lockSwitcherOnMobile,
		animateRows,
		views,
		bulkActionsProps,
	};

	return (
		<DataViewProvider value={ctx as DataViewContextValue<RowData>}>
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

export type DataViewerToolbarProps<TData extends RowData> = Omit<
	DataToolbarProps<TData>,
	"view"
>;

function DataViewToolbar<TData extends RowData>(
	props: DataViewerToolbarProps<TData>,
) {
	const { view, lockSwitcherOnMobile, views } = useDataViewContext<TData>();
	return (
		<DataToolbar
			view={view}
			lockSwitcherOnMobile={lockSwitcherOnMobile}
			views={views}
			{...props}
		/>
	);
}

export interface DataViewerBodyProps<TData extends RowData> {
	tableProps?: Omit<DataTableProps<TData>, "view" | "slots">;
	cardsProps?: Omit<
		DataCardsProps<TData>,
		"view" | "slots" | "renderCard" | "fallbackRole"
	>;
}

function DataViewBody<TData extends RowData>({
	tableProps,
	cardsProps,
}: DataViewerBodyProps<TData>) {
	const { view, slots, renderCard, fallbackRole, animateRows, views } =
		useDataViewContext<TData>();
	// A registered opt-in view (e.g. schedule) renders its own body. If the active view id has no
	// matching registration — e.g. a stale `?view=schedule` URL with no `views` prop — fall through
	// to the built-in table, so an unregistered view degrades gracefully rather than rendering blank.
	// Rendered through `Slot` (hooks inside the registration stay valid) and keyed by id so two
	// registered views never share one component position's hook state.
	const registered = views?.find((v) => v.id === view.view);
	if (registered) {
		return <Slot key={registered.id} render={registered.render} ctx={view} />;
	}
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

function DataViewPagination<TData extends RowData>(
	props: Omit<DataPaginationProps<TData>, "view">,
) {
	const { view } = useDataViewContext<TData>();
	return <DataPagination view={view} {...props} />;
}

function DataViewBulkActions<TData extends RowData>(
	props: Omit<DataBulkActionsProps<TData>, "view" | "slots">,
) {
	const { view, slots, bulkActionsProps } = useDataViewContext<TData>();
	return (
		<DataBulkActions
			view={view}
			slots={slots}
			{...bulkActionsProps}
			{...props}
		/>
	);
}

DataViewer.Toolbar = DataViewToolbar;
DataViewer.BulkActions = DataViewBulkActions;
DataViewer.Body = DataViewBody;
DataViewer.Pagination = DataViewPagination;
