// Derives the resource list for the resource view from the column tagged `meta.schedule.role ===
// "resource"`, using its filter `options` as the rows. This is the ergonomic default — resources
// "just work" from the column; an explicit `resources` prop on `DataResourceSchedule` overrides it
// (to add colors, order, or payloads). `buildResourceCounts` below overlays server facet counts.

import type { ScheduleResourceData } from "@mantine/schedule";
import type { DataColumnDef } from "../types/column";
import type { FacetData } from "../types/facets";

/**
 * Maps the `resource`-role column's filter `options` (`{ value, label }`) to Mantine
 * `ScheduleResourceData` (`{ id, label }`, Mantine assigns colors). Pure: returns `[]` when no
 * resource column or no options are found, and leaves any dev warning to the caller (which can warn
 * once per mount rather than on every render).
 */
export function deriveResources<TData>(
	columns: DataColumnDef<TData>[],
): ScheduleResourceData[] {
	const resourceCol = columns.find(
		(c) => c.meta?.schedule?.role === "resource",
	);
	const options = resourceCol?.meta?.filter?.options;
	if (!options || options.length === 0) return [];
	return options.map((o) => ({ id: o.value, label: o.label }));
}

/**
 * Builds a `value → count` map from the resource column's value facet, for overlaying server counts
 * on the (stable) resource rows. Returns `null` when there is no value facet to read counts from.
 */
export function buildResourceCounts(
	facet: FacetData | undefined,
): Map<string, number> | null {
	if (facet?.type !== "values") return null;
	const counts = new Map<string, number>();
	for (const entry of facet.values) counts.set(entry.value, entry.count);
	return counts;
}
