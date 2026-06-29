// Shared chrome for the schedule-family presentations: an optional header row (the `leftSection` /
// `rightSection` slots) plus the loading, error, and filtered-empty states — consistent with the
// table and card views. The presentation itself (Schedule / AgendaView / ResourcesSchedule) is passed
// as children and rendered in the ready state. A populated view with zero events renders the
// presentation (its own empty grid/list) rather than a "no results" message; the filtered-empty
// affordance only appears when filters are active.

import { Center, Group, Skeleton, Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { EmptyContent, ErrorContent } from "../components/StateMessage";
import type { DataViewSlots } from "../components/types";
import type { UseDataViewReturn } from "../types/options";

export interface ScheduleShellProps<TData> {
	view: UseDataViewReturn<TData>;
	slots?: Pick<DataViewSlots<TData>, "Empty" | "ErrorState">;
	leftSection?: ReactNode;
	rightSection?: ReactNode;
	/** Whether any events resolved — gates the first-load skeleton and the filtered-empty message. */
	hasEvents: boolean;
	/** The presentation node, rendered in the ready state. */
	children: ReactNode;
}

export function ScheduleShell<TData>({
	view,
	slots,
	leftSection,
	rightSection,
	hasEvents,
	children,
}: ScheduleShellProps<TData>) {
	const { renderStatus } = view;

	const renderBody = (): ReactNode => {
		if (renderStatus.phase === "error") {
			return (
				<Center p="xl">
					<ErrorContent view={view} slots={slots} />
				</Center>
			);
		}
		// First load with nothing to show yet: a skeleton. Once events exist the presentation stays
		// mounted across window changes so navigation never flashes a skeleton over it.
		if (renderStatus.phase === "loading" && !hasEvents) {
			return <Skeleton height={480} radius="sm" />;
		}
		if (renderStatus.phase === "empty-filtered" && !hasEvents) {
			return (
				<Center p="xl">
					<EmptyContent view={view} slots={slots} />
				</Center>
			);
		}
		return children;
	};

	const body = renderBody();

	// No header sections: render the body directly so the common case adds no wrapper.
	if (leftSection == null && rightSection == null) return <>{body}</>;

	return (
		<Stack gap="sm">
			<Group justify="space-between" wrap="wrap" gap="sm">
				<Group gap="sm" wrap="wrap">
					{leftSection}
				</Group>
				<Group gap="sm" wrap="wrap">
					{rightSection}
				</Group>
			</Group>
			{body}
		</Stack>
	);
}
