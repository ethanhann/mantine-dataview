// Accessibility smoke test over the real Mantine `<Schedule>` (not the lightweight mock used in
// DataSchedule.test.tsx), so axe checks the actual rendered calendar DOM.

import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import { DataSchedule } from "./DataSchedule";

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
}

const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.date("endsAt", { schedule: "end" })
	.build();

const rows: Shift[] = [
	{
		id: "1",
		name: "Morning",
		startsAt: "2026-06-28T09:00:00.000Z",
		endsAt: "2026-06-28T10:00:00.000Z",
	},
];

function Harness() {
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
	return <DataSchedule view={view} />;
}

describe("DataSchedule a11y", () => {
	it("has no accessibility violations in week view", async () => {
		const { container } = render(
			<MantineProvider>
				<Harness />
			</MantineProvider>,
		);
		expect(await axe(container)).toHaveNoViolations();
	});
});
