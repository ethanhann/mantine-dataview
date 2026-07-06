// Accessibility smoke tests over the REAL Mantine schedule-family components (not the lightweight
// mocks used in the unit tests), so axe checks the actual rendered DOM for each presentation.

import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import type { UseDataViewReturn } from "../types/options";
import { DataAgenda } from "./DataAgenda";
import { DataResourceSchedule } from "./DataResourceSchedule";
import { DataSchedule } from "./DataSchedule";

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
	room: string;
}

const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.date("endsAt", { schedule: "end" })
	.select("room", {
		schedule: "resource",
		options: [
			{ value: "A", label: "Room A" },
			{ value: "B", label: "Room B" },
		],
	})
	.build();

const rows: Shift[] = [
	{
		id: "1",
		name: "Morning",
		startsAt: "2026-06-28T09:00:00.000Z",
		endsAt: "2026-06-28T10:00:00.000Z",
		room: "A",
	},
];

function Harness({
	render: renderBody,
}: {
	render: (view: UseDataViewReturn<Shift>) => ReactNode;
}) {
	const view = useDataView<Shift>({
		columns,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (r) => r.id,
		initialState: {
			window: {
				start: "2026-06-28T00:00:00.000Z",
				end: "2026-07-05T00:00:00.000Z",
				level: "week",
			},
		},
	});
	return <>{renderBody(view)}</>;
}

async function noViolations(
	renderBody: (view: UseDataViewReturn<Shift>) => ReactNode,
) {
	const { container } = render(
		<MantineProvider>
			<Harness render={renderBody} />
		</MantineProvider>,
	);
	expect(await axe(container)).toHaveNoViolations();
}

describe("schedule-family a11y", () => {
	it("calendar has no accessibility violations", async () => {
		await noViolations((view) => <DataSchedule view={view} />);
	});

	it("agenda has no accessibility violations", async () => {
		await noViolations((view) => <DataAgenda view={view} />);
	});

	it("resources has no accessibility violations", async () => {
		await noViolations((view) => <DataResourceSchedule view={view} />);
	});
});
