// Event-shaped fixtures for the schedule presentation stories: a small bookings dataset anchored
// to the current week, columns tagged with `meta.schedule` roles via the fluent builder, and a
// window-aware mock server that returns the events overlapping `request.window`.

import dayjs from "dayjs";
import { col } from "../index";
import type { DataColumnDef } from "../types/column";
import type { DataViewRequest, DataViewResponse } from "../types/request";

export interface Booking {
	id: string;
	title: string;
	/** ISO start datetime. */
	start: string;
	/** ISO end datetime. */
	end: string;
	room: "Aspen" | "Birch" | "Cedar";
	status: "confirmed" | "pending" | "cancelled";
}

const TITLES = [
	"Standup",
	"Design Review",
	"1:1",
	"Sprint Planning",
	"Demo",
	"Interview",
	"Retro",
	"Lunch & Learn",
	"Customer Call",
	"Pair Session",
];
const ROOMS: Booking["room"][] = ["Aspen", "Birch", "Cedar"];
const STATUSES: Booking["status"][] = ["confirmed", "pending", "cancelled"];
const DURATIONS = [30, 60, 90];

/** Mantine color per status, used by the `color` role's `map`. */
export const STATUS_COLOR: Record<Booking["status"], string> = {
	confirmed: "teal",
	pending: "yellow",
	cancelled: "red",
};

// Anchor to the start of the current week so events land in the default week view. Spread across
// five weeks so navigating forward/back reveals different events.
const base = dayjs().startOf("week");

export const bookings: Booking[] = (() => {
	const out: Booking[] = [];
	let id = 1;
	for (let d = 0; d < 35; d++) {
		const day = base.add(d, "day");
		const count = (d * 7) % 4; // 0–3 events per day, deterministic
		for (let k = 0; k < count; k++) {
			const start = day
				.hour(9 + ((d + k * 3) % 8))
				.minute(0)
				.second(0)
				.millisecond(0);
			const end = start.add(DURATIONS[(d + k) % DURATIONS.length]!, "minute");
			out.push({
				id: String(id),
				title: TITLES[(d + k) % TITLES.length]!,
				start: start.toISOString(),
				end: end.toISOString(),
				room: ROOMS[(d + k) % ROOMS.length]!,
				status: STATUSES[id % STATUSES.length]!,
			});
			id++;
		}
	}
	return out;
})();

// Card roles are set alongside schedule roles so the same columns project cleanly into the table,
// cards, and schedule presentations in the integrated DataViewer story.
export const eventColumns = col<Booking>()
	.text("title", { schedule: "title", card: "title" })
	.date("start", { schedule: "start", card: "meta" })
	.date("end", { schedule: "end", card: "meta" })
	.select("room", {
		schedule: "resource",
		card: "badge",
		options: ROOMS.map((r) => ({ value: r, label: r })),
	})
	.select("status", {
		schedule: {
			role: "color",
			map: (s) => STATUS_COLOR[s as Booking["status"]],
		},
		card: "badge",
		options: STATUSES.map((s) => ({ value: s, label: s })),
	})
	.build() satisfies DataColumnDef<Booking>[];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function matchesFilter(b: Booking, id: string, value: unknown): boolean {
	if (value == null || value === "") return true;
	return String(b[id as keyof Booking]) === String(value);
}

/**
 * A mock server for events. Honors `globalFilter` (title), column filters (room/status), and most
 * importantly `request.window` — returning only events that overlap the visible range, the way a
 * real calendar backend would.
 */
export function createEventFetcher(data: Booking[] = bookings, delay = 350) {
	return async (
		request: DataViewRequest,
	): Promise<DataViewResponse<Booking>> => {
		await sleep(delay);
		let result = data.slice();

		if (request.globalFilter) {
			const q = request.globalFilter.toLowerCase();
			result = result.filter((b) => b.title.toLowerCase().includes(q));
		}
		for (const f of request.filters) {
			result = result.filter((b) => matchesFilter(b, f.id, f.value));
		}

		// Schedule mode: a window is set, so return every event overlapping the visible range.
		if (request.window) {
			const ws = new Date(request.window.start).getTime();
			const we = new Date(request.window.end).getTime();
			result = result.filter(
				(b) =>
					new Date(b.start).getTime() < we && new Date(b.end).getTime() > ws,
			);
			// Per-room counts over the visible window, so the resource view can show live counts.
			const roomFacet = {
				type: "values" as const,
				values: ROOMS.map((room) => ({
					value: room,
					count: result.filter((b) => b.room === room).length,
				})),
			};
			return {
				rows: result,
				rowCount: result.length,
				facets: { room: roomFacet },
			};
		}

		// Table/cards mode: no window, so paginate the full filtered set like a normal list backend.
		const total = result.length;
		const { pageIndex, pageSize } = request.pagination;
		const start = pageIndex * pageSize;
		return { rows: result.slice(start, start + pageSize), rowCount: total };
	};
}
