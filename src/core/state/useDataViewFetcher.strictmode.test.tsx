import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../../components/DataTable";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { UseDataViewReturn } from "../../types/options";
import type { DataViewRequest, DataViewResponse } from "../../types/request";
import { useDataViewFetcher } from "./useDataViewFetcher";

interface User {
	id: string;
	name: string;
}
const columns = [
	createColumnHelper<User>().accessor("name", { header: "Name" }),
] satisfies DataColumnDef<User>[];

let captured: UseDataViewReturn<User> | null = null;

afterEach(() => {
	captured = null;
});

function Harness({
	fetcher,
}: {
	fetcher: (
		r: DataViewRequest,
		ctx: { signal: AbortSignal },
	) => Promise<DataViewResponse<User>>;
}) {
	const view = useDataViewFetcher<User>({
		columns,
		getRowId: (u) => u.id,
		fetcher,
	});
	captured = view;
	return <DataTable view={view} />;
}

function renderStrict(ui: React.ReactElement) {
	return render(
		<StrictMode>
			<MantineProvider>{ui}</MantineProvider>
		</StrictMode>,
	);
}

describe("useDataViewFetcher under React.StrictMode", () => {
	it("renders the error state when the mount fetch rejects (signal-ignoring fetcher)", async () => {
		// Arrange
		const fetcher = vi.fn(async () => {
			await new Promise((r) => setTimeout(r, 10));
			throw new Error("HTTP 500");
		});

		// Act
		renderStrict(<Harness fetcher={fetcher} />);

		// Assert
		await waitFor(() =>
			expect(screen.getByText("Something went wrong.")).toBeVisible(),
		);
		expect(captured?.status).toBe("error");
		expect(captured?.isFetching).toBe(false);
		expect(captured?.isRevalidating).toBe(false);
		// The mount pass fetch is aborted by the StrictMode cleanup and the setup arm
		// re-issues exactly once, so the fetcher runs twice and no more.
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("renders rows when the mount fetch resolves (control case)", async () => {
		// Arrange
		const fetcher = vi.fn(async () => ({
			rows: [{ id: "1", name: "Ada" }],
			rowCount: 1,
		}));

		// Act
		renderStrict(<Harness fetcher={fetcher} />);

		// Assert
		await waitFor(() => expect(screen.getByText("Ada")).toBeVisible());
	});

	it("still loads data when a signal-respecting fetcher is aborted by the cleanup", async () => {
		// Arrange
		const fetcher = vi.fn(
			(_r: DataViewRequest, { signal }: { signal: AbortSignal }) =>
				new Promise<DataViewResponse<User>>((resolve, reject) => {
					const timer = setTimeout(
						() => resolve({ rows: [{ id: "1", name: "Ada" }], rowCount: 1 }),
						25,
					);
					signal.addEventListener("abort", () => {
						clearTimeout(timer);
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		);

		// Act
		renderStrict(<Harness fetcher={fetcher} />);

		// Assert
		await waitFor(() => expect(screen.getByText("Ada")).toBeVisible());
		expect(captured?.status).toBe("success");
		expect(captured?.isFetching).toBe(false);
		// One aborted mount fetch, one re-issued fetch. The aborted fetch's late
		// resolution is dropped by the request-id guard rather than double-rendering.
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
