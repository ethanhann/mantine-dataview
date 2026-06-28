// View switcher. It is hidden when the responsive rule forces cards and the switcher is locked.
// Otherwise it is disabled while forced, so the control never lies about the active view.

import { SegmentedControl, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";
import type { ViewMode } from "../../types/state";
import type { RegisteredView } from "../types";

export interface ViewSwitcherProps<TData> {
	view: UseDataViewReturn<TData>;
	lockSwitcherOnMobile?: boolean;
	/** Disable the control (e.g. while data is loading). */
	disabled?: boolean;
	/** Custom label for the table option. Default: "Table". */
	tableLabel?: ReactNode;
	/** Custom label for the cards option. Default: "Cards". */
	cardsLabel?: ReactNode;
	/**
	 * Opt-in presentations to append after the built-in table/cards options. Only their `id` and
	 * `label` are used, so the schedule chip appears only when its view is registered.
	 */
	views?: ReadonlyArray<Pick<RegisteredView<unknown>, "id" | "label">>;
}

export function ViewSwitcher<TData>({
	view,
	lockSwitcherOnMobile,
	disabled,
	tableLabel = "Table",
	cardsLabel = "Cards",
	views,
}: ViewSwitcherProps<TData>) {
	if (view.isMobileForced && lockSwitcherOnMobile) return null;

	const data = [
		{ value: "table" as ViewMode, label: tableLabel },
		{ value: "cards" as ViewMode, label: cardsLabel },
		...(views ?? []).map((v) => ({ value: v.id, label: v.label })),
	];
	const available = new Set<string>(data.map((d) => d.value));

	const control = (
		<SegmentedControl
			aria-label="View"
			value={view.view}
			disabled={disabled || view.isMobileForced}
			onChange={(value) => {
				if (available.has(value)) view.setView(value as ViewMode);
			}}
			data={data}
		/>
	);

	// Explain why the control is inert when the responsive rule forces cards on small screens.
	if (view.isMobileForced) {
		return (
			<Tooltip label="Cards are shown on small screens" withinPortal>
				<span>{control}</span>
			</Tooltip>
		);
	}
	return control;
}
