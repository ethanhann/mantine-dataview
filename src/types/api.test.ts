import { assertType, describe, expect, expectTypeOf, it } from "vitest";
import type {
	DataColumnDef,
	DataViewRequest,
	DataViewResponse,
	DataViewState,
	UseDataViewOptions,
} from "../index";
import { createColumnHelper } from "../index";

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
		expectTypeOf<DataViewState["view"]>().toEqualTypeOf<"table" | "cards">();
		expectTypeOf<DataViewState["rowSelection"]>().toEqualTypeOf<
			Record<string, boolean>
		>();
		// `idle` is a valid status; the union is closed.
		assertType<DataViewState["columnFilters"]>([{ id: "status", value: 1 }]);
	});
});
