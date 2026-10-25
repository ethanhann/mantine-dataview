import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import type { ScheduleProps } from "@mantine/schedule";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import { DataSchedule } from "./DataSchedule";

const received = vi.hoisted(() => ({
	props: {} as Record<string, unknown>,
}));

vi.mock("@mantine/schedule", () => ({
	Schedule: (props: Record<string, unknown>) => {
		received.props = props;
		return <div data-testid="schedule" />;
	},
}));

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

const ROWS: Shift[] = [
	{
		id: "1",
		name: "Morning",
		startsAt: "2026-06-28T09:00:00.000Z",
		endsAt: "2026-06-28T11:00:00.000Z",
	},
];

function Harness({
	scheduleProps,
	editable = false,
}: {
	scheduleProps?: Partial<ScheduleProps>;
	editable?: boolean;
}) {
	const view = useDataView<Shift>({
		columns,
		rows: ROWS,
		rowCount: ROWS.length,
		status: "success",
		getRowId: (r) => r.id,
	});
	return (
		<DataSchedule
			view={view}
			scheduleProps={scheduleProps}
			onEventMove={editable ? () => {} : undefined}
		/>
	);
}

function renderSchedule(
	scheduleProps?: Partial<ScheduleProps>,
	editable = false,
) {
	received.props = {};
	render(
		<MantineProvider>
			<DatesProvider settings={{}}>
				<Harness scheduleProps={scheduleProps} editable={editable} />
			</DatesProvider>
		</MantineProvider>,
	);
	return received.props;
}

describe("DataSchedule scheduleProps pass-through", () => {
	it("forwards the placement rules to the Mantine schedule", () => {
		// Arrange
		const canDropEvent = vi.fn(() => true);
		const onEventPlacementRejected = vi.fn();

		// Act
		const props = renderSchedule(
			{ preventEventOverlap: true, canDropEvent, onEventPlacementRejected },
			true,
		);

		// Assert
		expect(props.preventEventOverlap).toBe(true);
		expect(props.canDropEvent).toBe(canDropEvent);
		expect(props.onEventPlacementRejected).toBe(onEventPlacementRejected);
		expect(props.withEventsDragAndDrop).toBe(true);
	});

	it("forwards withInteractiveBackgroundEvents to the Mantine schedule", () => {
		// Arrange / Act
		const props = renderSchedule({ withInteractiveBackgroundEvents: true });

		// Assert
		expect(props.withInteractiveBackgroundEvents).toBe(true);
	});

	it("forwards the day view intervals and overlap mode", () => {
		// Arrange
		const dayViewProps = {
			eventDragInterval: 15,
			eventResizeInterval: 30,
			eventOverlapMode: "cascade" as const,
		};

		// Act
		const props = renderSchedule({ dayViewProps });

		// Assert
		expect(props.dayViewProps).toEqual(dayViewProps);
	});

	it("forwards the week view intervals and overlap mode", () => {
		// Arrange
		const weekViewProps = {
			eventDragInterval: 10,
			eventResizeInterval: 20,
			eventOverlapMode: "cascade" as const,
		};

		// Act
		const props = renderSchedule({ weekViewProps });

		// Assert
		expect(props.weekViewProps).toEqual(weekViewProps);
	});

	it("lets a consumer drop handler replace the library move handler", () => {
		// Arrange
		const onEventDrop = vi.fn();

		// Act
		const props = renderSchedule({ onEventDrop }, true);

		// Assert
		expect(props.onEventDrop).toBe(onEventDrop);
	});
});
