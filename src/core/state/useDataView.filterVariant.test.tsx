import { MantineProvider } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewRequest } from "../../types/request";
import { useDataView } from "./useDataView";

type RequestFn = (request: DataViewRequest) => void;
const requestSpy = () => vi.fn<RequestFn>();

function lastRequest(spy: Mock<RequestFn>): DataViewRequest {
	const call = spy.mock.calls.at(-1);
	if (!call) throw new Error("onRequestChange was never called");
	return call[0];
}

interface User {
	id: string;
	name: string;
	status: "active" | "pending";
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("status", {
		meta: {
			label: "Status",
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

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

describe("filter variant on request", () => {
	it("stamps variant from column meta onto request filter entries", () => {
		// Arrange
		const onRequestChange = requestSpy();
		const cols = [
			helper.accessor("name", {
				meta: {
					label: "Name",
					filter: { variant: "text" },
				},
			}),
			helper.accessor("status", {
				meta: {
					label: "Status",
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

		renderHook(
			() =>
				useDataView({
					columns: cols,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					onRequestChange,
					initialState: {
						columnFilters: [{ id: "status", value: "active" }],
					},
				}),
			{ wrapper },
		);

		// Act
		const req = lastRequest(onRequestChange);

		// Assert
		expect(req.filters).toEqual([
			{ id: "status", value: "active", variant: "select" },
		]);
	});

	it("leaves variant undefined for columns with no filter meta", () => {
		// Arrange
		const onRequestChange = requestSpy();

		renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					onRequestChange,
					initialState: {
						columnFilters: [{ id: "name", value: "Ada" }],
					},
				}),
			{ wrapper },
		);

		// Act
		const req = lastRequest(onRequestChange);

		// Assert
		expect(req.filters).toEqual([
			{ id: "name", value: "Ada", variant: undefined },
		]);
	});

	it("passes through variant declared on a custom filter component", () => {
		// Arrange
		const onRequestChange = requestSpy();
		const CustomFilter = () => null;
		const cols = [
			helper.accessor("name", {
				meta: {
					label: "Name",
					filter: { component: CustomFilter, variant: "dateRange" },
				},
			}),
		] satisfies DataColumnDef<User>[];

		renderHook(
			() =>
				useDataView({
					columns: cols,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					onRequestChange,
					initialState: {
						columnFilters: [
							{ id: "name", value: ["2026-01-01", "2026-06-30"] },
						],
					},
				}),
			{ wrapper },
		);

		// Act
		const req = lastRequest(onRequestChange);

		// Assert
		expect(req.filters).toEqual([
			{
				id: "name",
				value: ["2026-01-01", "2026-06-30"],
				variant: "dateRange",
			},
		]);
	});

	it("does not add variant to DataViewState.columnFilters", () => {
		// Arrange
		const { result } = renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					initialState: {
						columnFilters: [{ id: "status", value: "active" }],
					},
				}),
			{ wrapper },
		);

		// Act (state is read directly, no action needed)

		// Assert
		const stateFilter = result.current.state.columnFilters[0]!;
		expect(stateFilter).toEqual({ id: "status", value: "active" });
		expect("variant" in stateFilter).toBe(false);
	});
});
