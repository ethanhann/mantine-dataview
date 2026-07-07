import { MantineProvider } from "@mantine/core";
import { render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataToolbar } from "../components/DataToolbar";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import { useDataView } from "./state/useDataView";
import { belowBreakpointQuery, useForceCards } from "./useForceCards";

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

/** Force `matchMedia` to a fixed result (Mantine's useMediaQuery reads it). */
function mockMatchMedia(matches: boolean) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("belowBreakpointQuery", () => {
	it("subtracts an epsilon so the boundary doesn't overlap a min-width query", () => {
		expect(belowBreakpointQuery("48em")).toBe("(max-width: 47.99em)");
		expect(belowBreakpointQuery("768px")).toBe("(max-width: 767.9px)");
	});
});

describe("useForceCards", () => {
	it("is false when no breakpoint is configured", () => {
		mockMatchMedia(true);
		const { result } = renderHook(() => useForceCards(undefined), { wrapper });
		expect(result.current).toBe(false);
	});

	it("is true below the configured breakpoint", () => {
		mockMatchMedia(true);
		const { result } = renderHook(
			() => useForceCards({ forceCardsBelow: "sm" }),
			{ wrapper },
		);
		expect(result.current).toBe(true);
	});

	it("is false above the configured breakpoint", () => {
		mockMatchMedia(false);
		const { result } = renderHook(
			() => useForceCards({ forceCardsBelow: "sm" }),
			{ wrapper },
		);
		expect(result.current).toBe(false);
	});
});

interface Row {
	id: string;
	name: string;
}
const columns = [
	createColumnHelper<Row>().accessor("name", { header: "Name" }),
] satisfies DataColumnDef<Row>[];

describe("useDataView responsive integration", () => {
	it("forces cards below the breakpoint but remembers the explicit choice", () => {
		mockMatchMedia(true);
		const { result } = renderHook(
			() =>
				useDataView<Row>({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (r) => r.id,
					defaultView: "table",
					responsive: { forceCardsBelow: "sm" },
				}),
			{ wrapper },
		);
		expect(result.current.isMobileForced).toBe(true);
		expect(result.current.view).toBe("cards"); // forced
		expect(result.current.state.view).toBe("table"); // choice preserved
	});

	it("honors the stored choice above the breakpoint", () => {
		mockMatchMedia(false);
		const { result } = renderHook(
			() =>
				useDataView<Row>({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (r) => r.id,
					defaultView: "table",
					responsive: { forceCardsBelow: "sm" },
				}),
			{ wrapper },
		);
		expect(result.current.isMobileForced).toBe(false);
		expect(result.current.view).toBe("table");
	});
});

function ToolbarHarness({ lock }: { lock?: boolean }) {
	const view = useDataView<Row>({
		columns,
		rows: [],
		rowCount: 0,
		status: "success",
		getRowId: (r) => r.id,
		responsive: { forceCardsBelow: "sm" },
	});
	return <DataToolbar view={view} lockSwitcherOnMobile={lock} />;
}

describe("ViewSwitcher under force", () => {
	it("disables the switcher while forced", () => {
		mockMatchMedia(true);
		render(
			<MantineProvider>
				<ToolbarHarness />
			</MantineProvider>,
		);
		expect(screen.getByRole("radio", { name: "Cards" })).toBeDisabled();
	});

	it("hides the switcher when forced and locked", () => {
		mockMatchMedia(true);
		render(
			<MantineProvider>
				<ToolbarHarness lock />
			</MantineProvider>,
		);
		expect(screen.queryByRole("radio", { name: "Cards" })).toBeNull();
	});
});
