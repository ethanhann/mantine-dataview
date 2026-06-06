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
	revalidateDelay,
}: {
	fetcher: (r: DataViewRequest) => Promise<DataViewResponse<User>>;
	revalidateDelay?: number;
}) {
	const view = useDataViewFetcher<User>({
		columns,
		getRowId: (u) => u.id,
		fetcher,
		revalidateDelay,
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

	it("exposes isRevalidating as false by default", async () => {
		const fetcher = vi.fn(async () => ({
			rows: [{ id: "1", name: "Ada" }],
			rowCount: 1,
		}));
		render(<Harness fetcher={fetcher} />, { wrapper });
		await waitFor(() => expect(captured?.status).toBe("success"));
		expect(captured?.isRevalidating).toBe(false);
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

describe("optimistic reconciliation", () => {
	const initialRows: User[] = [
		{ id: "1", name: "Ada" },
		{ id: "2", name: "Grace" },
	];

	function makeFetcher(serverRows?: User[]) {
		return vi.fn(async () => ({
			rows: serverRows ?? initialRows,
			rowCount: (serverRows ?? initialRows).length,
		}));
	}

	describe("patchRow", () => {
		it("replaces a row on the current page immediately", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));

			expect(screen.getByText("Ada")).toBeVisible();

			await act(async () => {
				captured?.patchRow({ id: "1", name: "Ada Lovelace" });
			});

			expect(screen.getByText("Ada Lovelace")).toBeVisible();
			expect(screen.queryByText("Ada")).toBeNull();
			expect(screen.getByText("Grace")).toBeVisible();
		});

		it("is a no-op if the row is not on the current page", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.patchRow({ id: "999", name: "Unknown" });
			});

			expect(screen.getByText("Ada")).toBeVisible();
			expect(screen.getByText("Grace")).toBeVisible();
			expect(screen.queryByText("Unknown")).toBeNull();
		});

		it("sets isRevalidating after mutation", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));
			expect(captured?.isRevalidating).toBe(false);

			await act(async () => {
				captured?.patchRow({ id: "1", name: "Ada Lovelace" });
			});

			expect(captured?.isRevalidating).toBe(true);
		});
	});

	describe("insertRow", () => {
		it("prepends the row and increments rowCount", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.insertRow({ id: "3", name: "Marie" });
			});

			expect(screen.getByText("Marie")).toBeVisible();
			expect(screen.getByText("Ada")).toBeVisible();
			expect(captured?.table.getRowCount()).toBe(3);
		});
	});

	describe("removeRow", () => {
		it("removes the row and decrements rowCount", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.removeRow("1");
			});

			expect(screen.queryByText("Ada")).toBeNull();
			expect(screen.getByText("Grace")).toBeVisible();
			expect(captured?.table.getRowCount()).toBe(1);
		});

		it("is a no-op for unknown IDs", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={5000} />, {
				wrapper,
			});
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.removeRow("999");
			});

			expect(screen.getByText("Ada")).toBeVisible();
			expect(screen.getByText("Grace")).toBeVisible();
			expect(captured?.table.getRowCount()).toBe(2);
		});
	});

	describe("background revalidation", () => {
		it("revalidates after the delay and replaces optimistic state with server truth", async () => {
			let fetchCount = 0;
			const fetcher = vi.fn(async () => {
				fetchCount++;
				if (fetchCount === 1) {
					return { rows: initialRows, rowCount: 2 };
				}
				return {
					rows: [
						{ id: "1", name: "Ada (server)" },
						{ id: "2", name: "Grace" },
					],
					rowCount: 2,
				};
			});

			render(<Harness fetcher={fetcher} revalidateDelay={50} />, { wrapper });
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.patchRow({ id: "1", name: "Ada (optimistic)" });
			});

			expect(screen.getByText("Ada (optimistic)")).toBeVisible();

			await waitFor(
				() => expect(screen.getByText("Ada (server)")).toBeVisible(),
				{ timeout: 3000 },
			);
			expect(captured?.isRevalidating).toBe(false);
		});

		it("server removes a row that no longer matches filters", async () => {
			let fetchCount = 0;
			const fetcher = vi.fn(async () => {
				fetchCount++;
				if (fetchCount === 1) {
					return { rows: initialRows, rowCount: 2 };
				}
				return {
					rows: [{ id: "2", name: "Grace" }],
					rowCount: 1,
				};
			});

			render(<Harness fetcher={fetcher} revalidateDelay={50} />, { wrapper });
			await waitFor(() => expect(captured?.status).toBe("success"));

			await act(async () => {
				captured?.patchRow({ id: "1", name: "Ada (edited)" });
			});

			expect(screen.getByText("Ada (edited)")).toBeVisible();

			await waitFor(
				() => expect(screen.queryByText("Ada (edited)")).toBeNull(),
				{ timeout: 3000 },
			);
			expect(screen.getByText("Grace")).toBeVisible();
		});

		it("coalesces rapid mutations into fewer revalidation fetches", async () => {
			const fetcher = makeFetcher();
			render(<Harness fetcher={fetcher} revalidateDelay={100} />, { wrapper });
			await waitFor(() => expect(captured?.status).toBe("success"));
			const callsAfterMount = fetcher.mock.calls.length;

			await act(async () => {
				captured?.patchRow({ id: "1", name: "Ada v2" });
				captured?.patchRow({ id: "2", name: "Grace v2" });
				captured?.insertRow({ id: "3", name: "Marie" });
			});

			await waitFor(() => expect(captured?.isRevalidating).toBe(false), {
				timeout: 3000,
			});

			expect(fetcher.mock.calls.length - callsAfterMount).toBe(1);
		});
	});
});
