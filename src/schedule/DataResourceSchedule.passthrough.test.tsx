import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import type { ResourcesScheduleProps } from "@mantine/schedule";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import { DataResourceSchedule } from "./DataResourceSchedule";

const received = vi.hoisted(() => ({
	props: {} as Record<string, unknown>,
}));

vi.mock("@mantine/schedule", () => ({
	ResourcesSchedule: (props: Record<string, unknown>) => {
		received.props = props;
		return <div data-testid="resources" />;
	},
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
		options: [
			{ value: "A", label: "Room A" },
			{ value: "B", label: "Room B" },
		],
	})
	.build();

const ROWS: Shift[] = [
	{ id: "1", name: "Morning", startsAt: "2026-06-28T09:00:00.000Z", room: "A" },
];

const GROUPS = [{ label: "North", resourceIds: ["A"] }];

function Harness({
	resourcesProps,
	groups,
	editable = false,
}: {
	resourcesProps?: Partial<ResourcesScheduleProps>;
	groups?: typeof GROUPS;
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
		<DataResourceSchedule
			view={view}
			groups={groups}
			resourcesProps={resourcesProps}
			onEventMove={editable ? () => {} : undefined}
		/>
	);
}

function renderResources(options: {
	resourcesProps?: Partial<ResourcesScheduleProps>;
	groups?: typeof GROUPS;
	editable?: boolean;
}) {
	received.props = {};
	render(
		<MantineProvider>
			<DatesProvider settings={{}}>
				<Harness {...options} />
			</DatesProvider>
		</MantineProvider>,
	);
	return received.props;
}

describe("DataResourceSchedule resourcesProps pass-through", () => {
	it("forwards the placement rules to the Mantine resources schedule", () => {
		// Arrange
		const canDropEvent = vi.fn(() => true);
		const onEventPlacementRejected = vi.fn();

		// Act
		const props = renderResources({
			resourcesProps: {
				preventEventOverlap: true,
				canDropEvent,
				onEventPlacementRejected,
			},
			editable: true,
		});

		// Assert
		expect(props.preventEventOverlap).toBe(true);
		expect(props.canDropEvent).toBe(canDropEvent);
		expect(props.onEventPlacementRejected).toBe(onEventPlacementRejected);
		expect(props.withEventsDragAndDrop).toBe(true);
	});

	it("forwards withInteractiveBackgroundEvents to the Mantine resources schedule", () => {
		// Arrange / Act
		const props = renderResources({
			resourcesProps: { withInteractiveBackgroundEvents: true },
		});

		// Assert
		expect(props.withInteractiveBackgroundEvents).toBe(true);
	});

	it("keeps the day view intervals without groups", () => {
		// Arrange
		const dayViewProps = { eventDragInterval: 15, eventResizeInterval: 30 };

		// Act
		const props = renderResources({ resourcesProps: { dayViewProps } });

		// Assert
		expect(props.dayViewProps).toEqual(dayViewProps);
	});

	it("keeps the week view intervals next to the groups", () => {
		// Arrange
		const weekViewProps = { eventDragInterval: 10, eventResizeInterval: 20 };

		// Act
		const props = renderResources({
			resourcesProps: { weekViewProps },
			groups: GROUPS,
		});

		// Assert
		expect(props.weekViewProps).toMatchObject({
			...weekViewProps,
			groups: GROUPS,
		});
	});

	it("keeps a consumer key in every view props object when groups are set", () => {
		// Arrange
		const resourcesProps = {
			dayViewProps: { eventDragInterval: 5 },
			weekViewProps: { eventDragInterval: 10 },
			monthViewProps: { rowHeight: 80 },
		};

		// Act
		const props = renderResources({ resourcesProps, groups: GROUPS });

		// Assert
		expect(props.dayViewProps).toMatchObject(resourcesProps.dayViewProps);
		expect(props.weekViewProps).toMatchObject(resourcesProps.weekViewProps);
		expect(props.monthViewProps).toMatchObject(resourcesProps.monthViewProps);
	});
});
