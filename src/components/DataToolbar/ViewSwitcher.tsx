// View switcher. It is hidden when the responsive rule forces cards and the switcher is locked.
// Otherwise it is disabled while forced, so the control never lies about the active view.

import { SegmentedControl } from "@mantine/core";
import type { UseDataViewReturn } from "../../types/options";

export function ViewSwitcher<TData>({
	view,
	lockSwitcherOnMobile,
}: {
	view: UseDataViewReturn<TData>;
	lockSwitcherOnMobile?: boolean;
}) {
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
				{ value: "table", label: "Table" },
				{ value: "cards", label: "Cards" },
			]}
		/>
	);
}
