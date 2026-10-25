// Standalone date navigator for the calendar: prev / today / next + a day/week/month/year level
// selector. Drives the core's `window` slice. (The agenda has its own `DataAgendaNav`.)

import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import type { RowData } from "../types/table";
import { levelLabels, WindowNav } from "./_shared/WindowNav";

export interface DataScheduleNavProps<TData extends RowData> {
	view: UseDataViewReturn<TData>;
	/** Level used when no window is set yet. Default `"week"`. */
	defaultLevel?: ScheduleLevel;
	/** Levels offered, in order. Default `["day", "week", "month", "year"]`. */
	levels?: ScheduleLevel[];
	/** Disable the controls (e.g. while data is loading). */
	disabled?: boolean;
}

export function DataScheduleNav<TData extends RowData>({
	view,
	defaultLevel = "week",
	levels = ["day", "week", "month", "year"],
	disabled,
}: DataScheduleNavProps<TData>) {
	return (
		<WindowNav
			view={view}
			defaultLevel={defaultLevel}
			levels={levels}
			labels={levelLabels(view.labels)}
			selectorLabel={view.labels.calendarLevel}
			disabled={disabled}
		/>
	);
}
