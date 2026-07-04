// Consumer testing utilities: an in-memory fetcher that answers `DataViewRequest`s from a fixed
// row set, and a response builder. For app tests and Storybook fixtures, not production; filter
// interpretation is a documented heuristic, not a contract (a real server owns semantics).

import type { FacetData } from "../types/facets";
import type { DataViewRequest, DataViewResponse } from "../types/request";

export interface MockFetcherOptions<TData> {
	/** Artificial delay in milliseconds before resolving, to exercise loading states. */
	latency?: number;
	/** Compute facets from the filtered (pre-pagination) rows. */
	facets?: (rows: TData[]) => Record<string, FacetData>;
	/** Compute summary aggregates from the filtered (pre-pagination) rows. */
	summary?: (rows: TData[]) => Record<string, unknown>;
}

function matchesFilter(fieldValue: unknown, filterValue: unknown): boolean {
	// Two-element array of numbers/nulls reads as a range, other arrays as membership,
	// strings as case-insensitive contains, everything else as strict equality.
	if (Array.isArray(filterValue)) {
		const [lo, hi] = filterValue;
		const isRange =
			filterValue.length === 2 &&
			(lo == null || typeof lo === "number") &&
			(hi == null || typeof hi === "number") &&
			(lo != null || hi != null);
		if (isRange) {
			const n = Number(fieldValue);
			if (Number.isNaN(n)) return false;
			return (lo == null || n >= lo) && (hi == null || n <= hi);
		}
		return filterValue.some((v) => String(v) === String(fieldValue));
	}
	if (typeof filterValue === "string") {
		return String(fieldValue).toLowerCase().includes(filterValue.toLowerCase());
	}
	return fieldValue === filterValue;
}

function compare(a: unknown, b: unknown): number {
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b));
}

/**
 * Builds a fetcher that answers requests from `allRows`: filters (heuristic per value shape),
 * global search over string fields, multi-column sort, then pagination. `rowCount` reflects the
 * filtered total, so page math behaves like a real backend.
 */
export function createMockFetcher<TData extends object>(
	allRows: TData[],
	options: MockFetcherOptions<TData> = {},
): (request: DataViewRequest) => Promise<DataViewResponse<TData>> {
	return async (request) => {
		if (options.latency) {
			await new Promise((resolve) => setTimeout(resolve, options.latency));
		}
		// biome-ignore lint/suspicious/noExplicitAny: heterogeneous consumer row shapes
		const field = (row: TData, id: string): unknown => (row as any)[id];

		let rows = allRows.filter((row) =>
			request.filters.every(({ id, value }) =>
				matchesFilter(field(row, id), value),
			),
		);
		if (request.globalFilter) {
			const q = request.globalFilter.toLowerCase();
			rows = rows.filter((row) =>
				Object.values(row).some(
					(v) => typeof v === "string" && v.toLowerCase().includes(q),
				),
			);
		}
		for (const sort of [...request.sorting].reverse()) {
			rows = [...rows].sort(
				(a, b) =>
					compare(field(a, sort.id), field(b, sort.id)) * (sort.desc ? -1 : 1),
			);
		}
		const { pageIndex, pageSize } = request.pagination;
		const page = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
		return {
			rows: page,
			rowCount: rows.length,
			...(options.facets ? { facets: options.facets(rows) } : {}),
			...(options.summary ? { summary: options.summary(rows) } : {}),
		};
	};
}

/** A `DataViewResponse` with `rowCount` derived from the rows; override any field. */
export function buildResponse<TData>(
	rows: TData[],
	overrides: Partial<DataViewResponse<TData>> = {},
): DataViewResponse<TData> {
	return { rows, rowCount: rows.length, ...overrides };
}
