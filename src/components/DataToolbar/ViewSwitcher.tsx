// View switcher. It is hidden when the responsive rule forces cards and the switcher is locked.
// Otherwise it is disabled while forced, so the control never lies about the active view.

import { SegmentedControl } from "@mantine/core";
import type { ReactNode } from "react";
import type { UseDataViewReturn } from "../../types/options";

export interface ViewSwitcherProps<TData> {
	view: UseDataViewReturn<TData>;
	lockSwitcherOnMobile?: boolean;
	/** Custom label for the table option. Default: "Table". */
	tableLabel?: ReactNode;
	/** Custom label for the cards option. Default: "Cards". */
	cardsLabel?: ReactNode;
}

export function ViewSwitcher<TData>({
	view,
	lockSwitcherOnMobile,
	tableLabel = "Table",
	cardsLabel = "Cards",
}: ViewSwitcherProps<TData>) {
	if (view.isMobileForced && lockSwitcherOnMobile) return null;

	return (
		<SegmentedControl
			aria-label="View"
			value={view.view}
			disabled={view.isMobileForced}
			onChange={(value) => {
				if (value === "table" || value === "cards") view.setView(value);
			}}
			data={[
				{ value: "table", label: tableLabel as string },
				{ value: "cards", label: cardsLabel as string },
			]}
		/>
	);
}
