// Registration factory for the schedule presentation. Returns a `RegisteredView` that
// `<DataViewer views={[...]} />` (Phase 3) uses to add the schedule body and its switcher option.
// Bundling the config here keeps the consumer's call site to a single line.

import type { RegisteredView } from "../components/_shared/types";
import { DataSchedule, type DataScheduleProps } from "./DataSchedule";

export interface ScheduleViewOptions<TData>
	extends Omit<DataScheduleProps<TData>, "view"> {
	/** Switcher label. Default `"Schedule"`. */
	label?: RegisteredView<TData>["label"];
}

/**
 * Builds the registration descriptor for the schedule view.
 *
 * ```tsx
 * <DataViewer view={view} views={[scheduleView({ toEvent })]} />
 * ```
 */
export function scheduleView<TData>(
	options: ScheduleViewOptions<TData> = {},
): RegisteredView<TData> {
	const { label = "Schedule", ...scheduleProps } = options;
	return {
		id: "schedule",
		label,
		render: (view) => <DataSchedule view={view} {...scheduleProps} />,
	};
}
