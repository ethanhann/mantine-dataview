// Shared date navigator for the schedule family: prev / today / next plus a span/level selector,
// driving the core's `window` slice. `DataScheduleNav` (calendar) and `DataAgendaNav` (list) wrap it
// with their own defaults and labels.

import { Button, Group, SegmentedControl } from "@mantine/core";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { computeWindow, shiftWindow } from "./dateWindow";
import { useFirstDayOfWeek } from "./useFirstDayOfWeek";

export interface WindowNavProps<TData> {
	view: UseDataViewReturn<TData>;
	/** Level used when no window is set yet. */
	defaultLevel: ScheduleLevel;
	/** Levels offered in the selector, in order. */
	levels: ScheduleLevel[];
	/** Display label per level. */
	labels: Record<ScheduleLevel, string>;
	/** Accessible label for the level/span selector. */
	selectorLabel: string;
	/** Disable the controls (e.g. while data is loading). */
	disabled?: boolean;
}

export function WindowNav<TData>({
	view,
	defaultLevel,
	levels,
	labels,
	selectorLabel,
	disabled,
}: WindowNavProps<TData>) {
	const window = view.state.window;
	const level: ScheduleLevel = window?.level ?? defaultLevel;
	const firstDayOfWeek = useFirstDayOfWeek();

	const step = (direction: -1 | 1) => {
		const current = window ?? computeWindow(new Date(), level, firstDayOfWeek);
		view.setWindow(shiftWindow(current, direction, firstDayOfWeek));
	};
	const goToday = () =>
		view.setWindow(computeWindow(new Date(), level, firstDayOfWeek));
	const setLevel = (next: ScheduleLevel) => {
		const anchor = window ? new Date(window.start) : new Date();
		view.setWindow(computeWindow(anchor, next, firstDayOfWeek));
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
				aria-label={selectorLabel}
				size="xs"
				value={level}
				disabled={disabled}
				onChange={(v) => setLevel(v as ScheduleLevel)}
				data={levels.map((l) => ({ value: l, label: labels[l] }))}
			/>
		</Group>
	);
}
