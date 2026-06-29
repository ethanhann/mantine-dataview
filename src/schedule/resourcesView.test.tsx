import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import { resourcesView } from "./resourcesView";

// The double surfaces the resolved `resources` so a test can prove options flow through the factory.
vi.mock("@mantine/schedule", () => ({
	ResourcesSchedule: (props: {
		resources: { id: string | number; label: string }[];
	}) => (
		<div data-testid="resources" data-resource-count={props.resources.length}>
			{props.resources.map((r) => (
				<span key={r.id} data-testid="resource">
					{r.label}
				</span>
			))}
		</div>
	),
}));

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	room: string;
}
const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.select("room", {
		schedule: "resource",
		options: [{ value: "A", label: "Room A" }],
	})
	.build();

function renderDescriptor(descriptor: ReturnType<typeof resourcesView<Shift>>) {
	function Harness() {
		const view = useDataView<Shift>({
			columns,
			rows: [
				{ id: "1", name: "A", startsAt: "2026-06-28T09:00:00.000Z", room: "A" },
			],
			rowCount: 1,
			status: "success",
			getRowId: (r) => r.id,
		});
		return <>{descriptor.render(view)}</>;
	}
	return render(
		<MantineProvider>
			<Harness />
		</MantineProvider>,
	);
}

describe("resourcesView", () => {
	it("returns a resources-id descriptor with a default label", () => {
		// Act
		const descriptor = resourcesView<Shift>();
		// Assert
		expect(descriptor.id).toBe("resources");
		expect(descriptor.label).toBe("Resources");
		expect(typeof descriptor.render).toBe("function");
	});

	it("accepts a custom label", () => {
		// Act
		const descriptor = resourcesView<Shift>({ label: "Rooms" });
		// Assert
		expect(descriptor.label).toBe("Rooms");
	});

	it("renders the resource presentation, deriving rows from the column", () => {
		// Arrange
		const descriptor = resourcesView<Shift>();
		// Act
		renderDescriptor(descriptor);
		// Assert: the column-derived single room reached the presentation.
		expect(screen.getByTestId("resources")).toHaveAttribute(
			"data-resource-count",
			"1",
		);
		expect(screen.getByText("Room A")).toBeInTheDocument();
	});

	it("forwards non-label options to the presentation", () => {
		// Arrange: an explicit resources option must override column derivation.
		const descriptor = resourcesView<Shift>({
			resources: [
				{ id: "x", label: "Explicit X" },
				{ id: "y", label: "Explicit Y" },
			],
		});
		// Act
		renderDescriptor(descriptor);
		// Assert
		expect(screen.getByTestId("resources")).toHaveAttribute(
			"data-resource-count",
			"2",
		);
		expect(screen.getByText("Explicit X")).toBeInTheDocument();
		expect(screen.queryByText("Room A")).toBeNull();
	});
});
