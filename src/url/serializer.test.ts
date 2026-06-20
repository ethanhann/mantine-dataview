import { describe, expect, it } from "vitest";
import type { ColumnFilterMeta } from "../types/column";
import type { DataViewState } from "../types/state";
import {
	defaultUrlSerializer,
	deserializeParams,
	resolveInclude,
	SYNCABLE_KEYS,
	serializeState,
} from "./serializer";

// Backed by a Map, mirroring the production `buildFilterMetaLookup` (which is immune to prototype
// keys like `__proto__`, unlike a plain-object lookup).
const metaMap = new Map<string, ColumnFilterMeta>([
	["status", { variant: "select" }],
	["tags", { variant: "multiselect" }],
	["age", { variant: "numberRange" }],
	["active", { variant: "boolean" }],
	["created", { variant: "dateRange" }],
]);
const getFilterMeta = (id: string): ColumnFilterMeta | undefined =>
	metaMap.get(id);

const base: DataViewState = {
	pagination: { pageIndex: 0, pageSize: 10 },
	sorting: [],
	columnFilters: [],
	globalFilter: "",
	rowSelection: {},
	columnVisibility: {},
	columnPinning: { left: [], right: [] },
	view: "table",
};

const ctx = (include = [...SYNCABLE_KEYS]) => ({
	serializer: defaultUrlSerializer,
	include,
	getFilterMeta,
});
const dctx = (current = base, include = [...SYNCABLE_KEYS]) => ({
	...ctx(include),
	current,
});

describe("serializeState", () => {
	it("omits page on the first page but keeps size and view", () => {
		expect(serializeState(base, ctx())).toEqual({ size: "10", view: "table" });
	});

	it("encodes pagination (1-based), sorting, search, view, and filters", () => {
		const state: DataViewState = {
			...base,
			pagination: { pageIndex: 1, pageSize: 25 },
			sorting: [
				{ id: "name", desc: false },
				{ id: "created", desc: true },
			],
			globalFilter: "ada",
			view: "cards",
			columnFilters: [
				{ id: "status", value: "active" },
				{ id: "tags", value: ["a", "b"] },
				{ id: "age", value: [1, 5] },
				{ id: "active", value: true },
			],
		};
		expect(serializeState(state, ctx())).toEqual({
			page: "2",
			size: "25",
			sort: "name:asc,created:desc",
			q: "ada",
			view: "cards",
			"f.status": "active",
			"f.tags": "a,b",
			"f.age": "1..5",
			"f.active": "true",
		});
	});

	it("drops empty filters from the URL", () => {
		const state: DataViewState = {
			...base,
			columnFilters: [
				{ id: "tags", value: [] },
				{ id: "age", value: [null, null] },
			],
		};
		expect(serializeState(state, ctx())).not.toHaveProperty("f.tags");
		expect(serializeState(state, ctx())).not.toHaveProperty("f.age");
	});

	it("honors an include subset", () => {
		const state: DataViewState = {
			...base,
			sorting: [{ id: "name", desc: true }],
			globalFilter: "x",
		};
		expect(serializeState(state, ctx(resolveInclude(["sorting"])))).toEqual({
			sort: "name:desc",
		});
	});
});

describe("deserializeParams", () => {
	it("round-trips a fully-populated state", () => {
		const state: DataViewState = {
			...base,
			pagination: { pageIndex: 3, pageSize: 50 },
			sorting: [{ id: "name", desc: true }],
			globalFilter: "grace",
			view: "cards",
			columnFilters: [
				{ id: "status", value: "active" },
				{ id: "tags", value: ["x", "y"] },
				{ id: "age", value: [2, 9] },
				{ id: "active", value: false },
				{ id: "created", value: ["2020-01-01", "2020-12-31"] },
			],
		};
		const params = serializeState(state, ctx());
		const back = deserializeParams(params, dctx());
		expect(back.pagination).toEqual({ pageIndex: 3, pageSize: 50 });
		expect(back.sorting).toEqual([{ id: "name", desc: true }]);
		expect(back.globalFilter).toBe("grace");
		expect(back.view).toBe("cards");
		expect(back.columnFilters).toEqual(state.columnFilters);
	});

	it("treats the URL as authoritative: empty params reset to defaults", () => {
		const back = deserializeParams({}, dctx());
		expect(back.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
		expect(back.sorting).toEqual([]);
		expect(back.globalFilter).toBe("");
		expect(back.columnFilters).toEqual([]);
	});

	it("decodes open-ended numeric ranges", () => {
		const back = deserializeParams({ "f.age": "..5" }, dctx());
		expect(back.columnFilters).toEqual([{ id: "age", value: [null, 5] }]);
	});

	it("keeps the current page size when size is absent", () => {
		const current = { ...base, pagination: { pageIndex: 0, pageSize: 100 } };
		const back = deserializeParams({ page: "2" }, dctx(current));
		expect(back.pagination).toEqual({ pageIndex: 1, pageSize: 100 });
	});

	it("ignores phantom filters for unknown column ids", () => {
		const back = deserializeParams(
			{ "f.status": "active", "f.__proto__": "x", "f.bogus": "y" },
			dctx(),
		);
		expect(back.columnFilters).toEqual([{ id: "status", value: "active" }]);
	});

	it("decodes garbage numeric range bounds to null instead of NaN", () => {
		const back = deserializeParams({ "f.age": "abc..def" }, dctx());
		expect(back.columnFilters).toEqual([{ id: "age", value: [null, null] }]);
	});

	it("clamps a non-positive or fractional page size to the current size", () => {
		const current = { ...base, pagination: { pageIndex: 0, pageSize: 20 } };
		expect(deserializeParams({ size: "0" }, dctx(current)).pagination).toEqual({
			pageIndex: 0,
			pageSize: 20,
		});
		expect(deserializeParams({ size: "-5" }, dctx(current)).pagination).toEqual(
			{ pageIndex: 0, pageSize: 20 },
		);
		expect(deserializeParams({ size: "30" }, dctx(current)).pagination).toEqual(
			{ pageIndex: 0, pageSize: 30 },
		);
	});

	it("omits the page size from the URL when it equals the supplied default", () => {
		const state = { ...base, pagination: { pageIndex: 0, pageSize: 25 } };
		const params = serializeState(state, { ...ctx(), defaultPageSize: 25 });
		expect(params.size).toBeUndefined();
		const written = serializeState(state, { ...ctx(), defaultPageSize: 10 });
		expect(written.size).toBe("25");
	});
});
