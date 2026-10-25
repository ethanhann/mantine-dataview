// Registration factory for the resource presentation, sibling to `scheduleView`/`agendaView`.

import type { RegisteredView } from "../components/_shared/types";
import type { RowData } from "../types/table";
import {
	DataResourceSchedule,
	type DataResourceScheduleProps,
} from "./DataResourceSchedule";

export interface ResourcesViewOptions<TData extends RowData>
	extends Omit<DataResourceScheduleProps<TData>, "view"> {
	/** Switcher label. Default `"Resources"`. */
	label?: RegisteredView<TData>["label"];
}

/**
 * Builds the registration descriptor for the resource view. With no `resources` option the rows are
 * derived from the `resource`-role column's filter options.
 *
 * ```tsx
 * <DataViewer view={view} views={[scheduleView(), resourcesView()]} />
 * ```
 */
export function resourcesView<TData extends RowData>(
	options: ResourcesViewOptions<TData> = {},
): RegisteredView<TData> {
	const { label = "Resources", ...resourcesProps } = options;
	return {
		id: "resources",
		label,
		render: (view) => <DataResourceSchedule view={view} {...resourcesProps} />,
	};
}
