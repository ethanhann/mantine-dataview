import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewRequest } from "../../types/request";
import { DataPagination } from "./DataPagination";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { header: "Name" }),
] satisfies DataColumnDef<User>[];

const rows: User[] = Array.from({ length: 10 }, (_, i) => ({
	id: String(i + 1),
	name: `User ${i + 1}`,
}));

type ReqSpy = Mock<(request: DataViewRequest) => void>;
const reqSpy = () => vi.fn<(request: DataViewRequest) => void>();

function Harness({
	onRequestChange,
	rowCount = 42,
}: {
	onRequestChange?: ReqSpy;
	rowCount?: number;
}) {
	const view = useDataView<User>({
		columns,
		rows,
		rowCount,
		status: "success",
		getRowId: (u) => u.id,
		onRequestChange,
	});
	return <DataPagination view={view} />;
}

const renderPager = (props: Parameters<typeof Harness>[0] = {}) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

const lastRequest = (spy: ReqSpy): DataViewRequest =>
	spy.mock.calls.at(-1)?.[0] as DataViewRequest;

describe("DataPagination", () => {
	it("shows the range summary from rowCount", () => {
		renderPager();
		expect(screen.getByText("1–10 of 42")).toBeVisible();
	});

	it("renders a pager with the derived page count", () => {
		renderPager(); // 42 rows / 10 per page = 5 pages
		expect(screen.getByRole("button", { name: "5" })).toBeVisible();
		expect(screen.queryByRole("button", { name: "6" })).toBeNull();
	});

	it("changes the page and emits an updated request", async () => {
		const onRequestChange = reqSpy();
		renderPager({ onRequestChange });
		await userEvent.click(screen.getByRole("button", { name: "2" }));
		expect(lastRequest(onRequestChange).pagination.pageIndex).toBe(1);
	});

	it("changes the page size and emits an updated request", () => {
		const onRequestChange = reqSpy();
		renderPager({ onRequestChange });
		// Mantine's Select dropdown doesn't expand under jsdom; its options are mounted.
		fireEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
		fireEvent.click(screen.getByRole("option", { name: "25", hidden: true }));
		expect(lastRequest(onRequestChange).pagination.pageSize).toBe(25);
	});

	it("handles an empty result without breaking", () => {
		renderPager({ rowCount: 0 });
		expect(screen.getByText("0–0 of 0")).toBeVisible();
		// With no full page of results there is nothing to navigate, so the pager
		// is hidden rather than rendering a dead "1" control.
		expect(screen.queryByRole("button", { name: "1" })).toBeNull();
	});
});
