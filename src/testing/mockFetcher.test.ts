import { describe, expect, it } from "vitest";
import type { DataViewRequest } from "../types/request";
import { buildResponse, createMockFetcher } from "./index";

interface User {
	id: string;
	name: string;
	role: string;
	age: number;
	active: boolean;
}

const USERS: User[] = [
	{ id: "1", name: "Ada", role: "admin", age: 36, active: true },
	{ id: "2", name: "Linus", role: "user", age: 54, active: false },
	{ id: "3", name: "Grace", role: "admin", age: 45, active: true },
	{ id: "4", name: "Alan", role: "user", age: 41, active: true },
];

function request(overrides: Partial<DataViewRequest> = {}): DataViewRequest {
	return {
		pagination: { pageIndex: 0, pageSize: 10 },
		sorting: [],
		filters: [],
		globalFilter: "",
		params: {},
		...overrides,
	};
}

describe("createMockFetcher", () => {
	it("paginates and reports the filtered total", async () => {
		// Arrange
		const fetcher = createMockFetcher(USERS);

		// Act
		const page = await fetcher(
			request({ pagination: { pageIndex: 1, pageSize: 2 } }),
		);

		// Assert
		expect(page.rows.map((u) => u.id)).toEqual(["3", "4"]);
		expect(page.rowCount).toBe(4);
	});

	it("sorts by the requested columns", async () => {
		// Arrange
		const fetcher = createMockFetcher(USERS);

		// Act
		const res = await fetcher(
			request({ sorting: [{ id: "age", desc: true }] }),
		);

		// Assert
		expect(res.rows.map((u) => u.age)).toEqual([54, 45, 41, 36]);
	});

	it("applies filter heuristics: contains, equality, membership, and range", async () => {
		// Arrange
		const fetcher = createMockFetcher(USERS);

		// Act
		const contains = await fetcher(
			request({ filters: [{ id: "name", value: "a" }] }),
		);
		const membership = await fetcher(
			request({ filters: [{ id: "role", value: ["admin"] }] }),
		);
		const range = await fetcher(
			request({ filters: [{ id: "age", value: [40, 50] }] }),
		);
		const equality = await fetcher(
			request({ filters: [{ id: "active", value: false }] }),
		);

		// Assert
		expect(contains.rows.map((u) => u.name)).toEqual(["Ada", "Grace", "Alan"]);
		expect(membership.rows.map((u) => u.name)).toEqual(["Ada", "Grace"]);
		expect(range.rows.map((u) => u.name)).toEqual(["Grace", "Alan"]);
		expect(equality.rows.map((u) => u.name)).toEqual(["Linus"]);
	});

	it("applies the global filter across string fields", async () => {
		// Arrange
		const fetcher = createMockFetcher(USERS);

		// Act
		const res = await fetcher(request({ globalFilter: "adm" }));

		// Assert
		expect(res.rows.map((u) => u.name)).toEqual(["Ada", "Grace"]);
	});

	it("attaches facets and summary from the option callbacks", async () => {
		// Arrange
		const fetcher = createMockFetcher(USERS, {
			summary: (rows) => ({ age: rows.reduce((n, u) => n + u.age, 0) }),
		});

		// Act
		const res = await fetcher(request());

		// Assert
		expect(res.summary).toEqual({ age: 176 });
	});
});

describe("buildResponse", () => {
	it("derives rowCount and accepts overrides", () => {
		// Arrange / Act
		const res = buildResponse(USERS.slice(0, 2), { rowCount: 40 });

		// Assert
		expect(res.rows).toHaveLength(2);
		expect(res.rowCount).toBe(40);
		expect(buildResponse(USERS).rowCount).toBe(4);
	});
});
