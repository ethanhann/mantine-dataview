import { MantineProvider } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../components/DataTable";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { UseDataViewReturn } from "../types/options";
import type { DataViewRequest, DataViewResponse } from "../types/request";
import { useDataViewFetcher } from "./useDataViewFetcher";

interface User {
	id: string;
	name: string;
}
const columns = [
	createColumnHelper<User>().accessor("name", { header: "Name" }),
] satisfies DataColumnDef<User>[];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

let captured: UseDataViewReturn<User> | null = null;

function Harness({
	fetcher,
}: {
	fetcher: (r: DataViewRequest) => Promise<DataViewResponse<User>>;
}) {
	const view = useDataViewFetcher<User>({
		columns,
		getRowId: (u) => u.id,
		fetcher,
	});
	captured = view;
	return <DataTable view={view} />;
}

afterEach(() => {
	captured = null;
});

describe("useDataViewFetcher", () => {
	it("fetches on mount and renders the result", async () => {
		const fetcher = vi.fn(async (_r: DataViewRequest) => ({
			rows: [{ id: "1", name: "Ada" }],
			rowCount: 1,
		}));
		render(<Harness fetcher={fetcher} />, { wrapper });

		await waitFor(() => expect(screen.getByText("Ada")).toBeVisible());
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0]?.[0].pagination).toEqual({
			pageIndex: 0,
			pageSize: 10,
		});
	});

	it("shows the error state when the fetcher rejects", async () => {
		const fetcher = vi.fn(async () => {
			throw new Error("boom");
		});
		render(<Harness fetcher={fetcher} />, { wrapper });
		await waitFor(() =>
			expect(screen.getByText("Something went wrong.")).toBeVisible(),
		);
	});

	it("ignores a stale response when a newer request resolves first", async () => {
		// The mount request resolves slowly with "Stale". The request from the page change
		// resolves fast with "Fresh". The id guard must keep "Fresh" and drop the late "Stale".
		let call = 0;
		const fetcher = vi.fn((_r: DataViewRequest) => {
			call += 1;
			const n = call;
			return new Promise<DataViewResponse<User>>((resolve) => {
				setTimeout(
					() =>
						resolve({
							rows: [{ id: String(n), name: n === 1 ? "Stale" : "Fresh" }],
							rowCount: 1,
						}),
					n === 1 ? 60 : 5,
				);
			});
		});

		render(<Harness fetcher={fetcher} />, { wrapper });
		// Fire a second request before the first resolves.
		act(() => captured?.table.setPageIndex(1));

		await waitFor(() => expect(screen.getByText("Fresh")).toBeVisible(), {
			timeout: 1000,
		});
		// Give the slow stale response time to (wrongly) land.
		await new Promise((r) => setTimeout(r, 80));
		expect(screen.queryByText("Stale")).toBeNull();
		expect(screen.getByText("Fresh")).toBeVisible();
	});
});
