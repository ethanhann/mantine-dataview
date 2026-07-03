// Shared empty and error content, so both presentations render identical defaults and honor the
// same slots. Each presentation supplies its own container. For the table that is a table cell
// spanning every column, and for the card grid it is a centered box.

import { Button, Stack, Text } from "@mantine/core";
import type { Table } from "@tanstack/react-table";
import type { UseDataViewReturn } from "../types/options";
import { Slot } from "./Slot";
import type { DataViewSlots } from "./types";

/** Resets all column filters and the global search. This is the clear action for filtered empty. */
export function clearAllFilters<TData>(table: Table<TData>): void {
	table.resetColumnFilters();
	table.setGlobalFilter("");
	// Return to the first page; the high page the user was on no longer exists once filters clear,
	// which would otherwise re-trigger the empty state.
	table.setPageIndex(0);
}

interface StateProps<TData> {
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
}

export function ErrorContent<TData>({ view, slots }: StateProps<TData>) {
	if (slots?.ErrorState) {
		return (
			<Slot
				render={slots.ErrorState}
				ctx={{ error: view.error, retry: view.refetch }}
			/>
		);
	}
	// Surface the error message in development to aid debugging; production keeps a generic message.
	const devMessage =
		typeof process !== "undefined" &&
		process.env.NODE_ENV !== "production" &&
		view.error instanceof Error
			? view.error.message
			: null;
	return (
		<Stack align="center" gap="xs">
			<Text c="red">{view.labels.errorMessage}</Text>
			{devMessage && (
				<Text c="dimmed" size="xs" ta="center">
					{devMessage}
				</Text>
			)}
			<Button variant="light" size="xs" onClick={view.refetch}>
				{view.labels.retry}
			</Button>
		</Stack>
	);
}

export function EmptyContent<TData>({ view, slots }: StateProps<TData>) {
	const filtered = view.renderStatus.phase === "empty-filtered";
	const clearFilters = () => clearAllFilters(view.table);
	if (slots?.Empty) {
		return <Slot render={slots.Empty} ctx={{ filtered, clearFilters }} />;
	}
	if (filtered) {
		return (
			<Stack align="center" gap="xs">
				<Text c="dimmed">{view.labels.noMatches}</Text>
				<Button variant="subtle" size="xs" onClick={clearFilters}>
					{view.labels.clearFilters}
				</Button>
			</Stack>
		);
	}
	return <Text c="dimmed">{view.labels.noResults}</Text>;
}
