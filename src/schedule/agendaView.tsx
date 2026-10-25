// Registration factory for the agenda presentation, sibling to `scheduleView`/`resourcesView`.

import type { RegisteredView } from "../components/_shared/types";
import type { RowData } from "../types/table";
import { DataAgenda, type DataAgendaProps } from "./DataAgenda";

export interface AgendaViewOptions<TData extends RowData>
	extends Omit<DataAgendaProps<TData>, "view"> {
	/** Switcher label. Default `"Agenda"`. */
	label?: RegisteredView<TData>["label"];
}

/**
 * Builds the registration descriptor for the agenda view.
 *
 * ```tsx
 * <DataViewer view={view} views={[scheduleView(), agendaView()]} />
 * ```
 */
export function agendaView<TData extends RowData>(
	options: AgendaViewOptions<TData> = {},
): RegisteredView<TData> {
	const { label = "Agenda", ...agendaProps } = options;
	return {
		id: "agenda",
		label,
		render: (view) => <DataAgenda view={view} {...agendaProps} />,
	};
}
