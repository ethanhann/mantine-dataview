// Shared mount behavior for the schedule-family presentations. On mount it marks the core's active
// view and seeds the visible window, then derives the current level/date. Marking the view is what
// lets the window drive the request even when the presentation is rendered standalone (the core only
// sends `window` for a windowed view). Both writes are guarded so a view/window from `initialState`
// or the URL wins, and so opening via `scheduleInitialState` is a single fetch.

import { useEffect } from "react";
import type { UseDataViewReturn } from "../types/options";
import type { DataViewWindow, ScheduleLevel, ViewMode } from "../types/state";
import { computeWindow } from "./dateWindow";

export interface WindowedView {
	level: ScheduleLevel;
	/** Anchor date for the current window (its start), or now before a window exists. */
	date: Date;
	window: DataViewWindow | undefined;
}

export function useWindowedView<TData>(
	view: UseDataViewReturn<TData>,
	viewId: ViewMode,
	defaultLevel: ScheduleLevel,
): WindowedView {
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only; setView/setWindow are stable
	useEffect(() => {
		if (view.view !== viewId) view.setView(viewId);
		if (!view.state.window)
			view.setWindow(computeWindow(new Date(), defaultLevel));
	}, []);

	const window = view.state.window;
	return {
		level: window?.level ?? defaultLevel,
		date: window ? new Date(window.start) : new Date(),
		window,
	};
}
