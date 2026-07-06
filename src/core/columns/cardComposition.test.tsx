import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { useDataView } from "../state/useDataView";
import { composeCardLayout, resolveColumnLabel } from "./cardComposition";

interface User {
	id: string;
	name: string;
	email: string;
	avatar: string;
	status: string;
	role: string;
	age: number;
	bio: string;
	secret: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", {
		header: "Name",
		meta: { card: { role: "title" } },
	}),
	helper.accessor("email", {
		meta: { label: "Email", card: { role: "subtitle" } },
	}),
	helper.accessor("avatar", { meta: { card: { role: "media" } } }),
	helper.accessor("status", {
		meta: { label: "Status", card: { role: "badge", order: 2 } },
	}),
	helper.accessor("role", {
		meta: { label: "Role", card: { role: "badge", order: 1 } },
	}),
	helper.accessor("age", { meta: { label: "Age" } }), // no role, so it falls back to meta
	helper.accessor("bio", {
		meta: { label: "Bio", card: { role: "meta", showLabel: false } },
	}),
	helper.display({ id: "actions", header: "Actions" }), // display column with no role, so it is hidden
	helper.accessor("secret", { meta: { card: { role: "hidden" } } }),
] satisfies DataColumnDef<User>[];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function setupTable() {
	return renderHook(
		() =>
			useDataView({
				columns,
				rows: [],
				rowCount: 0,
				status: "success",
				getRowId: (u: User) => u.id,
			}),
		{ wrapper },
	);
}

const ids = (fields: { id: string }[]) => fields.map((f) => f.id);

describe("composeCardLayout", () => {
	it("buckets columns by card role", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table);
		expect(ids(layout.title)).toEqual(["name"]);
		expect(ids(layout.subtitle)).toEqual(["email"]);
		expect(ids(layout.media)).toEqual(["avatar"]);
	});

	it("orders fields within a role group by meta.card.order", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table);
		// role declares order 1, status declares order 2.
		expect(ids(layout.badge)).toEqual(["role", "status"]);
	});

	it("falls back to meta for accessor columns without a role", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table);
		expect(ids(layout.meta)).toEqual(["age", "bio"]);
	});

	it("excludes hidden-role and display columns from the card", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table);
		const all = Object.values(layout).flat();
		expect(ids(all)).not.toContain("secret");
		expect(ids(all)).not.toContain("actions");
	});

	it("respects an opt-in fallback of hidden", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table, {
			fallbackRole: "hidden",
		});
		// `age` has no explicit role, so it drops out; `bio` (explicit meta) stays.
		expect(ids(layout.meta)).toEqual(["bio"]);
	});

	it("mirrors columnVisibility so hiding a column drops its card field", () => {
		const { result } = setupTable();
		act(() => result.current.table.setColumnVisibility({ name: false }));
		const layout = composeCardLayout(result.current.table);
		expect(ids(layout.title)).toEqual([]);
	});

	it("defaults showLabel to true for meta and false for other roles", () => {
		const { result } = setupTable();
		const layout = composeCardLayout(result.current.table);
		expect(layout.title[0]?.showLabel).toBe(false);
		const age = layout.meta.find((f) => f.id === "age");
		const bio = layout.meta.find((f) => f.id === "bio");
		expect(age?.showLabel).toBe(true);
		expect(bio?.showLabel).toBe(false); // explicit override
	});

	it("resolves labels in order: meta.label, then string header, then id", () => {
		const { result } = setupTable();
		const column = (id: string) => {
			const c = result.current.table.getColumn(id);
			if (!c) throw new Error(`no column ${id}`);
			return c;
		};
		expect(resolveColumnLabel(column("email"))).toBe("Email"); // meta.label
		expect(resolveColumnLabel(column("name"))).toBe("Name"); // string header
		expect(resolveColumnLabel(column("avatar"))).toBe("Avatar"); // humanized id fallback
	});
});
