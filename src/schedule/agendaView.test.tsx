import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import { agendaView } from "./agendaView";

vi.mock("@mantine/schedule", () => ({
	AgendaView: () => <div data-testid="agenda" />,
}));

interface Shift {
	id: string;
	name: string;
	startsAt: string;
}
const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.build();

describe("agendaView", () => {
	it("returns an agenda-id descriptor with a default label", () => {
		// Act
		const descriptor = agendaView<Shift>();
		// Assert
		expect(descriptor.id).toBe("agenda");
		expect(descriptor.label).toBe("Agenda");
		expect(typeof descriptor.render).toBe("function");
	});

	it("accepts a custom label", () => {
		// Act
		const descriptor = agendaView<Shift>({ label: "Schedule list" });
		// Assert
		expect(descriptor.label).toBe("Schedule list");
	});

	it("renders the agenda presentation with its nav by default", () => {
		// Arrange
		const descriptor = agendaView<Shift>();
		// Act
		renderDescriptor(descriptor);
		// Assert: both the list and the default DataAgendaNav are present.
		expect(screen.getByTestId("agenda")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
	});

	it("forwards non-label options to the presentation (withNav: false)", () => {
		// Arrange
		const descriptor = agendaView<Shift>({ withNav: false });
		// Act
		renderDescriptor(descriptor);
		// Assert: the option reached DataAgenda, so the default nav is suppressed.
		expect(screen.getByTestId("agenda")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
	});
});

function renderDescriptor(descriptor: ReturnType<typeof agendaView<Shift>>) {
	function Harness() {
		const view = useDataView<Shift>({
			columns,
			rows: [{ id: "1", name: "A", startsAt: "2026-06-28T09:00:00.000Z" }],
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
