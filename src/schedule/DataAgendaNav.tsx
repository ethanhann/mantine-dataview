// Standalone navigator for the agenda list: prev / today / next plus a range selector. Mantine's
// `AgendaView` has no navigation of its own, so `DataAgenda` renders this by default. Framed as a
// listing range (day / week / month) rather than a calendar zoom, and it drops the "year" level
// (a year-long agenda list is rarely useful). It drives the same `window` slice as the calendar nav.

import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { levelLabels, WindowNav } from "./_shared/WindowNav";

export interface DataAgendaNavProps<TData> {
	view: UseDataViewReturn<TData>;
	/** Range used when no window is set yet. Default `"week"`. */
	defaultLevel?: ScheduleLevel;
	/** Ranges offered, in order. Default `["day", "week", "month"]` (no year). */
	levels?: ScheduleLevel[];
	/** Disable the controls (e.g. while data is loading). */
	disabled?: boolean;
}

export function DataAgendaNav<TData>({
	view,
	defaultLevel = "week",
	levels = ["day", "week", "month"],
	disabled,
}: DataAgendaNavProps<TData>) {
	return (
		<WindowNav
			view={view}
			defaultLevel={defaultLevel}
			levels={levels}
			labels={levelLabels(view.labels)}
			selectorLabel={view.labels.agendaRange}
			disabled={disabled}
		/>
	);
}
