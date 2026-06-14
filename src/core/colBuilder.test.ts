import { describe, expect, it } from "vitest";
import { col, humanize } from "./colBuilder";

interface Product {
	id: string;
	name: string;
	price: number;
	quantity: number;
	inStock: boolean;
	createdAt: string;
	status: string;
	tags: string;
}

describe("humanize", () => {
	it("converts camelCase", () =>
		expect(humanize("createdAt")).toBe("Created At"));
	it("converts snake_case", () =>
		expect(humanize("created_at")).toBe("Created At"));
	it("converts simple words", () => expect(humanize("name")).toBe("Name"));
	it("handles multiple uppercase", () =>
		expect(humanize("inStock")).toBe("In Stock"));
	it("splits acronym runs before a word", () =>
		expect(humanize("HTTPStatus")).toBe("HTTP Status"));
	it("splits a trailing initialism", () =>
		expect(humanize("userID")).toBe("User ID"));
	it("separates letters from digits", () =>
		expect(humanize("address1")).toBe("Address 1"));
});

describe("col builder", () => {
	it("builds text columns with defaults", () => {
		const columns = col<Product>().text("name").build();
		expect(columns).toHaveLength(1);
		const c = columns[0]!;
		expect(c.header).toBe("Name");
		expect(c.meta?.dataType).toBe("text");
		expect(c.meta?.filter).toEqual({ variant: "text" });
		expect(c.meta?.label).toBe("Name");
	});

	it("builds number columns with right alignment", () => {
		const columns = col<Product>().number("quantity").build();
		const c = columns[0]!;
		expect(c.meta?.dataType).toBe("number");
		expect(c.meta?.align).toBe("right");
		expect(c.meta?.filter).toEqual({ variant: "numberRange" });
	});

	it("builds currency columns", () => {
		const columns = col<Product>().currency("price").build();
		const c = columns[0]!;
		expect(c.meta?.dataType).toBe("currency");
		expect(c.meta?.align).toBe("right");
	});

	it("builds date columns", () => {
		const columns = col<Product>().date("createdAt").build();
		const c = columns[0]!;
		expect(c.meta?.dataType).toBe("date");
		expect(c.meta?.filter).toEqual({ variant: "dateRange" });
	});

	it("builds boolean columns", () => {
		const columns = col<Product>().boolean("inStock").build();
		const c = columns[0]!;
		expect(c.meta?.dataType).toBe("boolean");
		expect(c.meta?.filter).toEqual({ variant: "boolean" });
	});

	it("builds select columns with options", () => {
		const options = [
			{ value: "active", label: "Active" },
			{ value: "inactive", label: "Inactive" },
		];
		const columns = col<Product>().select("status", { options }).build();
		const c = columns[0]!;
		expect(c.meta?.filter).toEqual({ variant: "select", options });
	});

	it("builds multiselect columns with options", () => {
		const options = [{ value: "a", label: "A" }];
		const columns = col<Product>().multiselect("tags", { options }).build();
		const c = columns[0]!;
		expect(c.meta?.filter).toEqual({ variant: "multiselect", options });
	});

	it("sets card role from shorthand", () => {
		const columns = col<Product>().text("name", { card: "title" }).build();
		expect(columns[0]!.meta?.card).toEqual({ role: "title" });
	});

	it("sets card order", () => {
		const columns = col<Product>()
			.text("name", { card: "badge", cardOrder: 2 })
			.build();
		expect(columns[0]!.meta?.card).toEqual({ role: "badge", order: 2 });
	});

	it("disables filter with filter: false", () => {
		const columns = col<Product>().text("name", { filter: false }).build();
		expect(columns[0]!.meta?.filter).toBeUndefined();
	});

	it("merges filter options with preset defaults", () => {
		const columns = col<Product>()
			.number("quantity", { filter: { min: 0, max: 100 } })
			.build();
		expect(columns[0]!.meta?.filter).toEqual({
			variant: "numberRange",
			min: 0,
			max: 100,
		});
	});

	it("overrides header", () => {
		const columns = col<Product>()
			.text("name", { header: "Product Name" })
			.build();
		expect(columns[0]!.header).toBe("Product Name");
		expect(columns[0]!.meta?.label).toBe("Product Name");
	});

	it("overrides alignment", () => {
		const columns = col<Product>().text("name", { align: "center" }).build();
		expect(columns[0]!.meta?.align).toBe("center");
	});

	it("sets format override", () => {
		const fmt = { dateStyle: "short" } as const;
		const columns = col<Product>().date("createdAt", { format: fmt }).build();
		expect(columns[0]!.meta?.format).toEqual(fmt);
	});

	it("disables sorting", () => {
		const columns = col<Product>()
			.text("name", { enableSorting: false })
			.build();
		expect(columns[0]!.enableSorting).toBe(false);
	});

	it("passes through custom column defs", () => {
		const columns = col<Product>()
			.custom({ id: "actions", header: "Actions", cell: () => "..." })
			.build();
		expect(columns[0]!.header).toBe("Actions");
	});

	it("chains multiple columns", () => {
		const columns = col<Product>()
			.text("name", { card: "title" })
			.currency("price", { card: "meta" })
			.boolean("inStock", { card: "badge" })
			.build();
		expect(columns).toHaveLength(3);
		expect(columns[0]!.meta?.dataType).toBe("text");
		expect(columns[1]!.meta?.dataType).toBe("currency");
		expect(columns[2]!.meta?.dataType).toBe("boolean");
	});
});
