// Shared date navigator for the schedule family: prev / today / next plus a span/level selector,
// driving the core's `window` slice. `DataScheduleNav` (calendar) and `DataAgendaNav` (list) wrap it
// with their own defaults and labels.

import { Button, Group, SegmentedControl } from "@mantine/core";
import type { DataViewLabels } from "../types/labels";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { computeWindow, shiftWindow, windowMidpoint } from "./dateWindow";
import { useFirstDayOfWeek } from "./useFirstDayOfWeek";

/** Maps the view's string dictionary to the per-level display labels the navs render. */
export function levelLabels(
	labels: DataViewLabels,
): Record<ScheduleLevel, string> {
	return {
		day: labels.levelDay,
		week: labels.levelWeek,
		month: labels.levelMonth,
		year: labels.levelYear,
	};
}

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
	const viewLabels = view.labels;
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
		// Anchor on the midpoint: a padded month window starts in the previous month's
		// weeks, and anchoring there would land the new level on the wrong period.
		const anchor = window ? windowMidpoint(window) : new Date();
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
					aria-label={viewLabels.previous}
				>
					‹
				</Button>
				<Button
					variant="default"
					size="xs"
					onClick={goToday}
					disabled={disabled}
				>
					{viewLabels.today}
				</Button>
				<Button
					variant="default"
					size="xs"
					onClick={() => step(1)}
					disabled={disabled}
					aria-label={viewLabels.next}
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
