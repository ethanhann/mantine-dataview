// ScheduleShell gates the first-load skeleton on "has any fetch ever settled", not on whether the
// current window has events. Once a view has settled (ready or empty), a later windowed fetch keeps
// the presentation mounted instead of flashing a full-height skeleton over it.

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UseDataViewReturn } from "../../types/options";
import type { DataViewStatus } from "../../types/state";
import { ScheduleShell } from "./ScheduleShell";

function stubView(phase: DataViewStatus["phase"]): UseDataViewReturn<unknown> {
	return {
		renderStatus: { phase } as DataViewStatus,
	} as unknown as UseDataViewReturn<unknown>;
}

const skeletonCount = () =>
	document.querySelectorAll(".mantine-Skeleton-root").length;

function renderShell(phase: DataViewStatus["phase"]) {
	return render(
		<MantineProvider>
			<ScheduleShell view={stubView(phase)} hasEvents={false}>
				<div data-testid="presentation">calendar</div>
			</ScheduleShell>
		</MantineProvider>,
	);
}

describe("ScheduleShell first-load skeleton gate", () => {
	it("shows the skeleton on the first load, before any fetch has settled", () => {
		// Arrange & Act
		renderShell("loading");

		// Assert
		expect(skeletonCount()).toBe(1);
		expect(screen.queryByTestId("presentation")).toBeNull();
	});

	it("keeps the presentation mounted on a loading that follows a settle", () => {
		// Arrange
		const { rerender } = renderShell("loading");
		const rerenderPhase = (phase: DataViewStatus["phase"]) =>
			rerender(
				<MantineProvider>
					<ScheduleShell view={stubView(phase)} hasEvents={false}>
						<div data-testid="presentation">calendar</div>
					</ScheduleShell>
				</MantineProvider>,
			);

		// Act: transition loading -> empty (a first settle) -> loading (windowed navigation).
		rerenderPhase("empty");
		rerenderPhase("loading");

		// Assert: the second loading renders the presentation, not the skeleton.
		expect(skeletonCount()).toBe(0);
		expect(screen.getByTestId("presentation")).toBeInTheDocument();
	});
});
