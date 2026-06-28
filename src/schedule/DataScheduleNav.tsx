// Standalone date navigator for the schedule presentation: prev / today / next plus a level
// selector. It drives the core's `window` slice through `setWindow`, the same as the calendar's
// built-in header. Useful for placing navigation in the toolbar or pagination row (Phase 3 swaps
// the pager for it in schedule mode).

import { Button, Group, SegmentedControl } from "@mantine/core";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { computeWindow, shiftWindow } from "./dateWindow";

const LEVEL_LABELS: Record<ScheduleLevel, string> = {
	day: "Day",
	week: "Week",
	month: "Month",
	year: "Year",
};

export interface DataScheduleNavProps<TData> {
	view: UseDataViewReturn<TData>;
	/** Level used when no window is set yet. Default `"week"`. */
	defaultLevel?: ScheduleLevel;
	/** Levels offered in the selector, in order. Default `["day", "week", "month", "year"]`. */
	levels?: ScheduleLevel[];
	/** Disable the controls (e.g. while data is loading). */
	disabled?: boolean;
}

export function DataScheduleNav<TData>({
	view,
	defaultLevel = "week",
	levels = ["day", "week", "month", "year"],
	disabled,
}: DataScheduleNavProps<TData>) {
	const window = view.state.window;
	const level: ScheduleLevel = window?.level ?? defaultLevel;

	const step = (direction: -1 | 1) => {
		const current = window ?? computeWindow(new Date(), level);
		view.setWindow(shiftWindow(current, direction));
	};
	const goToday = () => view.setWindow(computeWindow(new Date(), level));
	const setLevel = (next: ScheduleLevel) => {
		const anchor = window ? new Date(window.start) : new Date();
		view.setWindow(computeWindow(anchor, next));
	};

	return (
		<Group gap="sm" wrap="nowrap">
			<Button.Group>
				<Button
					variant="default"
					size="xs"
					onClick={() => step(-1)}
					disabled={disabled}
					aria-label="Previous"
				>
					‹
				</Button>
				<Button
					variant="default"
					size="xs"
					onClick={goToday}
					disabled={disabled}
				>
					Today
				</Button>
				<Button
					variant="default"
					size="xs"
					onClick={() => step(1)}
					disabled={disabled}
					aria-label="Next"
				>
					›
				</Button>
			</Button.Group>
			<SegmentedControl
				aria-label="Calendar level"
				size="xs"
				value={level}
				disabled={disabled}
				onChange={(v) => setLevel(v as ScheduleLevel)}
				data={levels.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
			/>
		</Group>
	);
}
