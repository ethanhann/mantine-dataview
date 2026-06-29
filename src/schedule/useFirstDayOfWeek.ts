// Resolves the active week-start (0 = Sunday to 6 = Saturday) from Mantine's `DatesProvider`, the same
// source the calendar grid itself reads. The schedule presentations feed this into `computeWindow`/
// `shiftWindow` so the fetched window aligns with the rendered weeks and months. Reading it from the
// provider rather than a separate prop means there is no second value to keep in sync. Set
// `firstDayOfWeek` once on `DatesProvider` and both the grid and the request agree.

import { useDatesContext } from "@mantine/dates";

export function useFirstDayOfWeek(): number {
	return useDatesContext().getFirstDayOfWeek();
}
