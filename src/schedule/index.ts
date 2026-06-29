// Public entry for the opt-in schedule presentation: `@ethanhann/mantine-dataview/schedule`.
// Importing this subpath is what pulls in `@mantine/schedule` and `dayjs` (both optional peers);
// consumers who never import it pay nothing for the scheduler.

// Re-export the concrete Mantine event/resource types for convenience (alongside the core schedule
// column model below) so a consumer can author everything from this one subpath.
export type {
	ScheduleEventData,
	ScheduleResourceData,
	ScheduleResourceGroup,
} from "@mantine/schedule";
export type { RegisteredView } from "../components/types";
export type {
	DataViewEvent,
	ScheduleFieldMeta,
	ScheduleRole,
} from "../types/schedule";
export type { DataViewWindow, ScheduleLevel } from "../types/state";
export {
	type AgendaViewOptions,
	agendaView,
} from "./agendaView";
// Pure row → event composition, exported for custom presentations and tests.
export {
	type ComposeEventOptions,
	composeEvent,
} from "./composeEvent";
export {
	DataAgenda,
	type DataAgendaProps,
} from "./DataAgenda";
export {
	DataResourceSchedule,
	type DataResourceScheduleProps,
} from "./DataResourceSchedule";
export {
	DataSchedule,
	type DataScheduleProps,
} from "./DataSchedule";
export {
	DataScheduleNav,
	type DataScheduleNavProps,
} from "./DataScheduleNav";
// Date-window helpers, exported so consumers can drive `setWindow` from their own controls.
export { computeWindow, shiftWindow } from "./dateWindow";
// Resource-list derivation and facet count overlay, exported for custom resource presentations.
export { buildResourceCounts, deriveResources } from "./deriveResources";
// Shared event helpers, for custom schedule-family presentations.
export {
	type EventClickHandler,
	findEventRow,
	type ResolveEventsOptions,
	resolveEvents,
	toggleEventSelection,
} from "./resolveEvents";
export {
	type ResourcesViewOptions,
	resourcesView,
} from "./resourcesView";
export { composeScheduleEvent } from "./scheduleEvent";
export { scheduleInitialState } from "./scheduleInitialState";
export {
	type ScheduleViewOptions,
	scheduleView,
} from "./scheduleView";
