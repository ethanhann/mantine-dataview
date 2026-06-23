// Shared story fixtures. These are a small dataset, columns, and a mock server that applies the
// DataViewRequest over the data with a delay. It applies search, then filters, then sort, then
// pagination. That makes the stories fully interactive and exercises the real request and
// response contract.

import { Badge, Chip, Group } from "@mantine/core";
import { createColumnHelper } from "../index";
import type {
	CustomFilterComponentProps,
	DataColumnDef,
} from "../types/column";
import type { DataViewRequest, DataViewResponse } from "../types/request";

export interface Person {
	id: string;
	name: string;
	email: string;
	role: "Engineer" | "Designer" | "PM" | "Sales";
	status: "active" | "invited" | "suspended";
	age: number;
	location: string;
}

const FIRST = [
	"Ada",
	"Linus",
	"Grace",
	"Edsger",
	"Margaret",
	"Alan",
	"Barbara",
	"Dennis",
	"Ken",
	"Donald",
	"Katherine",
	"Tim",
	"Anita",
	"Guido",
	"Bjarne",
	"Radia",
	"John",
	"Frances",
	"Hedy",
	"Vint",
	"Leslie",
	"Shafi",
	"Joan",
	"Brian",
];
const LAST = [
	"Lovelace",
	"Torvalds",
	"Hopper",
	"Dijkstra",
	"Hamilton",
	"Turing",
];
const ROLES: Person["role"][] = ["Engineer", "Designer", "PM", "Sales"];
const STATUSES: Person["status"][] = ["active", "invited", "suspended"];
const CITIES = ["London", "Oslo", "Berlin", "Tokyo", "Austin", "Toronto"];

export const people: Person[] = FIRST.map((first, i) => {
	const last = LAST[i % LAST.length];
	return {
		id: String(i + 1),
		name: `${first} ${last}`,
		email: `${first.toLowerCase()}@example.com`,
		role: ROLES[i % ROLES.length] as Person["role"],
		status: STATUSES[i % STATUSES.length] as Person["status"],
		age: 24 + ((i * 7) % 40),
		location: CITIES[i % CITIES.length] as string,
	};
});

const STATUS_COLORS: Record<Person["status"], string> = {
	active: "green",
	invited: "blue",
	suspended: "red",
};

const col = createColumnHelper<Person>();

export const columns = [
	col.accessor("name", {
		header: "Name",
		meta: { label: "Name", card: { role: "title" } },
	}),
	col.accessor("email", {
		header: "Email",
		meta: {
			label: "Email",
			card: { role: "subtitle" },
			filter: { variant: "text" },
		},
	}),
	col.accessor("role", {
		header: "Role",
		meta: {
			label: "Role",
			card: { role: "badge", order: 1 },
			filter: {
				variant: "multiselect",
				options: ROLES.map((r) => ({ value: r, label: r })),
			},
		},
	}),
	col.accessor("status", {
		header: "Status",
		cell: (ctx) => {
			const value = ctx.getValue() as Person["status"];
			return (
				<Badge color={STATUS_COLORS[value]} variant="light">
					{value}
				</Badge>
			);
		},
		meta: {
			label: "Status",
			card: { role: "badge", order: 2 },
			filter: {
				variant: "select",
				options: STATUSES.map((s) => ({ value: s, label: s })),
			},
		},
	}),
	col.accessor("age", {
		header: "Age",
		meta: {
			label: "Age",
			align: "right",
			card: { role: "meta" },
			filter: { variant: "numberRange" },
			dataType: "number",
		},
	}),
	col.accessor("location", {
		header: "Location",
		meta: {
			label: "Location",
			card: { role: "meta" },
			filter: {
				component: ({ value, onChange }: CustomFilterComponentProps) => {
					const selected = (value as string) ?? "";
					return (
						<Chip.Group
							value={selected}
							onChange={(v) => onChange(v || undefined)}
						>
							<Group gap={4}>
								{CITIES.map((city) => (
									<Chip key={city} value={city} variant="light" size="xs">
										{city}
									</Chip>
								))}
							</Group>
						</Chip.Group>
					);
				},
			},
		},
	}),
] satisfies DataColumnDef<Person>[];

function field(p: Person, id: string): string | number {
	return p[id as keyof Person];
}

function matchesGlobal(p: Person, query: string): boolean {
	const q = query.toLowerCase();
	return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
}

function matchesFilter(p: Person, id: string, value: unknown): boolean {
	if (value == null || value === "") return true;
	if (id === "age" && Array.isArray(value)) {
		const [min, max] = value as [number | null, number | null];
		return (min == null || p.age >= min) && (max == null || p.age <= max);
	}
	if (Array.isArray(value)) {
		return value.length === 0 || value.includes(field(p, id));
	}
	const cell = field(p, id);
	return String(cell).toLowerCase().includes(String(value).toLowerCase());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A mock server that honors the full DataViewRequest over `data`. */
export function createMockFetcher(data: Person[] = people, delay = 450) {
	return async (
		request: DataViewRequest,
	): Promise<DataViewResponse<Person>> => {
		await sleep(delay);
		let result = data.slice();

		if (request.globalFilter) {
			result = result.filter((p) => matchesGlobal(p, request.globalFilter));
		}
		for (const f of request.filters) {
			result = result.filter((p) => matchesFilter(p, f.id, f.value));
		}
		if (request.sorting.length > 0) {
			result.sort((a, b) => {
				for (const sort of request.sorting) {
					const av = field(a, sort.id);
					const bv = field(b, sort.id);
					if (av === bv) continue;
					const cmp = (av ?? "") < (bv ?? "") ? -1 : 1;
					return sort.desc ? -cmp : cmp;
				}
				return 0;
			});
		}

		const total = result.length;
		const { pageIndex, pageSize } = request.pagination;
		const start = pageIndex * pageSize;
		return { rows: result.slice(start, start + pageSize), rowCount: total };
	};
}
