// Shared empty and error content, so both presentations render identical defaults and honor the
// same slots. Each presentation supplies its own container. For the table that is a table cell
// spanning every column, and for the card grid it is a centered box.

import { Button, Stack, Text } from "@mantine/core";
import type { Table } from "@tanstack/react-table";
import type { UseDataViewReturn } from "../types/options";
import type { DataViewSlots } from "./types";

/** Resets all column filters and the global search. This is the clear action for filtered empty. */
export function clearAllFilters<TData>(table: Table<TData>): void {
	table.resetColumnFilters();
	table.setGlobalFilter("");
}

interface StateProps<TData> {
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
}

export function ErrorContent<TData>({ view, slots }: StateProps<TData>) {
	if (slots?.ErrorState) {
		return <>{slots.ErrorState({ error: view.error, retry: view.refetch })}</>;
	}
	return (
		<Stack align="center" gap="xs">
			<Text c="red">Something went wrong.</Text>
			<Button variant="light" size="xs" onClick={view.refetch}>
				Retry
			</Button>
		</Stack>
	);
}

export function EmptyContent<TData>({ view, slots }: StateProps<TData>) {
	const filtered = view.renderStatus.phase === "empty-filtered";
	const clearFilters = () => clearAllFilters(view.table);
	if (slots?.Empty) {
		return <>{slots.Empty({ filtered, clearFilters })}</>;
	}
	if (filtered) {
		return (
			<Stack align="center" gap="xs">
				<Text c="dimmed">No matches.</Text>
				<Button variant="subtle" size="xs" onClick={clearFilters}>
					Clear filters
				</Button>
			</Stack>
		);
	}
	return <Text c="dimmed">No results.</Text>;
}
