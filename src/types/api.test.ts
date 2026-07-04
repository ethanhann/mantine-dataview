import type {
	ColumnOrderState,
	ColumnPinningState,
	ColumnSizingState,
	PaginationState,
	RowSelectionState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import { assertType, describe, expect, expectTypeOf, it } from "vitest";
import type {
	DataColumnDef,
	DataViewRequest,
	DataViewResponse,
	DataViewState,
	UseDataViewOptions,
} from "../index";
import { createColumnHelper } from "../index";

// Compile-time conformance: `DataViewState`'s slices must remain assignment-compatible with the
// TanStack v8 shapes they mirror, so they can flow straight into `useReactTable` without conversion.
// If TanStack changes one of these shapes, one of these assignments fails to compile — catching the
// drift at build time rather than at a distance.
() => {
	const _pagination: PaginationState = {} as DataViewState["pagination"];
	const _sorting: SortingState = {} as DataViewState["sorting"];
	const _selection: RowSelectionState = {} as DataViewState["rowSelection"];
	const _visibility: VisibilityState = {} as DataViewState["columnVisibility"];
	const _pinning: ColumnPinningState = {} as DataViewState["columnPinning"];
	const _sizing: ColumnSizingState = {} as DataViewState["columnSizing"];
	const _order: ColumnOrderState = {} as DataViewState["columnOrder"];
	// And the reverse direction, so the shapes stay structurally equal (not just one-way assignable).
	const _pagination2: DataViewState["pagination"] = {} as PaginationState;
	const _sorting2: DataViewState["sorting"] = {} as SortingState;
	const _sizing2: DataViewState["columnSizing"] = {} as ColumnSizingState;
	const _order2: DataViewState["columnOrder"] = {} as ColumnOrderState;
	void [
		_pagination,
		_sorting,
		_selection,
		_visibility,
		_pinning,
		_sizing,
		_order,
		_pagination2,
		_sorting2,
		_sizing2,
		_order2,
	];
};

interface User {
	id: string;
	name: string;
	status: "active" | "pending";
	age: number;
}

describe("public type surface (Phase 1)", () => {
	it("accepts the augmented ColumnMeta on column defs", () => {
		const col = createColumnHelper<User>();
		// The `satisfies` itself is the assertion: helper columns with `meta.card`,
		// `meta.filter`, and `meta.align` must satisfy `DataColumnDef<User>[]`.
		const columns = [
			col.accessor("name", {
				meta: {
					label: "Name",
					card: { role: "title", order: 0, showLabel: false },
					align: "left",
				},
			}),
			col.accessor("status", {
				meta: {
					label: "Status",
					card: { role: "badge" },
					filter: {
						variant: "select",
						options: [
							{ label: "Active", value: "active" },
							{ label: "Pending", value: "pending" },
						],
					},
				},
			}),
		] satisfies DataColumnDef<User>[];

		expect(columns).toHaveLength(2);
	});

	it("pins TData from rows/columns, not from callbacks (NoInfer)", () => {
		const options = {
			columns: [],
			rows: [] as User[],
			rowCount: 0,
			status: "idle",
			// `u` is `User` even though `getRowId` is not the inference source.
			getRowId: (u) => u.id,
		} satisfies UseDataViewOptions<User>;

		expectTypeOf(options.getRowId).parameter(0).toEqualTypeOf<User>();
	});

	it("models the backend-agnostic request/response contract", () => {
		expectTypeOf<DataViewRequest["pagination"]>().toEqualTypeOf<{
			pageIndex: number;
			pageSize: number;
		}>();
		expectTypeOf<DataViewRequest["filters"]>().toEqualTypeOf<
			Array<{ id: string; value: unknown }>
		>();
		expectTypeOf<DataViewRequest["globalFilter"]>().toEqualTypeOf<string>();
		expectTypeOf<DataViewResponse<User>["rows"]>().toEqualTypeOf<User[]>();
	});

	it("exposes the single source-of-truth state shape", () => {
		// Built-in views plus the opt-in schedule family (shipped from the `/schedule` subpath).
		expectTypeOf<DataViewState["view"]>().toEqualTypeOf<
			"table" | "cards" | "schedule" | "agenda" | "resources"
		>();
		expectTypeOf<DataViewState["rowSelection"]>().toEqualTypeOf<
			Record<string, boolean>
		>();
		// `idle` is a valid status; the union is closed.
		assertType<DataViewState["columnFilters"]>([{ id: "status", value: 1 }]);
	});
});
