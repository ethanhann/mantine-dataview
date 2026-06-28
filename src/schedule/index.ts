// Public entry for the opt-in schedule presentation: `@ethanhann/mantine-dataview/schedule`.
// Importing this subpath is what pulls in `@mantine/schedule` and `dayjs` (both optional peers);
// consumers who never import it pay nothing for the scheduler.

// Re-export the concrete Mantine event type for convenience, plus the core schedule column model
// so a consumer can author everything from this one subpath.
export type { ScheduleEventData } from "@mantine/schedule";
export type { RegisteredView } from "../components/types";
export type {
	DataViewEvent,
	ScheduleFieldMeta,
	ScheduleRole,
} from "../types/schedule";
export type { DataViewWindow, ScheduleLevel } from "../types/state";
// Pure row → event composition, exported for custom presentations and tests.
export {
	type ComposeEventOptions,
	composeEvent,
} from "./composeEvent";
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
export { composeScheduleEvent } from "./scheduleEvent";
export {
	type ScheduleViewOptions,
	scheduleView,
} from "./scheduleView";
