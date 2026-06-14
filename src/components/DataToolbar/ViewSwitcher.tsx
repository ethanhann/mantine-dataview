// View switcher. It is hidden when the responsive rule forces cards and the switcher is locked.
// Otherwise it is disabled while forced, so the control never lies about the active view.

import { SegmentedControl, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";

export interface ViewSwitcherProps<TData> {
	view: UseDataViewReturn<TData>;
	lockSwitcherOnMobile?: boolean;
	/** Disable the control (e.g. while data is loading). */
	disabled?: boolean;
	/** Custom label for the table option. Default: "Table". */
	tableLabel?: ReactNode;
	/** Custom label for the cards option. Default: "Cards". */
	cardsLabel?: ReactNode;
}

export function ViewSwitcher<TData>({
	view,
	lockSwitcherOnMobile,
	disabled,
	tableLabel = "Table",
	cardsLabel = "Cards",
}: ViewSwitcherProps<TData>) {
	if (view.isMobileForced && lockSwitcherOnMobile) return null;

	const control = (
		<SegmentedControl
			aria-label="View"
			value={view.view}
			disabled={disabled || view.isMobileForced}
			onChange={(value) => {
				if (value === "table" || value === "cards") view.setView(value);
			}}
			data={[
				{ value: "table", label: tableLabel },
				{ value: "cards", label: cardsLabel },
			]}
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
