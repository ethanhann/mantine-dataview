import { describe, expect, it } from "vitest";
import { resolveFormatter } from "./formatValue";

describe("resolveFormatter", () => {
	describe("text", () => {
		const fmt = resolveFormatter("text", undefined, undefined);
		it("formats strings", () => expect(fmt("hello")).toBe("hello"));
		it("formats null as empty", () => expect(fmt(null)).toBe(""));
		it("formats undefined as empty", () => expect(fmt(undefined)).toBe(""));
		it("formats numbers as strings", () => expect(fmt(42)).toBe("42"));
	});

	describe("number", () => {
		const fmt = resolveFormatter("number", undefined, undefined);
		it("formats with locale separators", () => {
			expect(fmt(1234)).toMatch(/1.?234/);
		});
		it("handles null", () => expect(fmt(null)).toBe(""));
		it("handles undefined", () => expect(fmt(undefined)).toBe(""));
	});

	describe("currency", () => {
		const fmt = resolveFormatter("currency", undefined, undefined);
		it("formats with currency symbol", () => {
			const result = fmt(1234.56);
			expect(result).toMatch(/1.?234/);
			expect(result).toMatch(/\$/);
		});
		it("handles null", () => expect(fmt(null)).toBe(""));
	});

	describe("date", () => {
		const fmt = resolveFormatter("date", undefined, undefined);
		it("formats ISO date strings", () => {
			const result = fmt("2026-06-02");
			expect(result).toBeTruthy();
			expect(result).not.toBe("");
		});
		it("formats Date objects", () => {
			const result = fmt(new Date("2026-01-15"));
			expect(result).toBeTruthy();
		});
		it("handles invalid dates", () => {
			expect(fmt("not-a-date")).toBe("not-a-date");
		});
		it("handles null", () => expect(fmt(null)).toBe(""));
	});

	describe("boolean", () => {
		const fmt = resolveFormatter("boolean", undefined, undefined);
		it("formats true as Yes", () => expect(fmt(true)).toBe("Yes"));
		it("formats false as No", () => expect(fmt(false)).toBe("No"));
		it("handles null", () => expect(fmt(null)).toBe(""));
	});

	describe("format resolution priority", () => {
		it("uses column format over table defaults", () => {
			const columnFmt = (v: unknown) => `col:${v}`;
			const tableFmt = (v: unknown) => `table:${v}`;
			const fmt = resolveFormatter("text", columnFmt, { text: tableFmt });
			expect(fmt("x")).toBe("col:x");
		});

		it("falls back to table defaults when no column format", () => {
			const tableFmt = (v: unknown) => `table:${v}`;
			const fmt = resolveFormatter("text", undefined, { text: tableFmt });
			expect(fmt("x")).toBe("table:x");
		});

		it("falls back to library default when no overrides", () => {
			const fmt = resolveFormatter("boolean", undefined, undefined);
			expect(fmt(true)).toBe("Yes");
		});

		it("accepts Intl options for number", () => {
			const fmt = resolveFormatter(
				"number",
				{ minimumFractionDigits: 2 },
				undefined,
			);
			expect(fmt(5)).toMatch(/5\.00/);
		});

		it("accepts Intl options for currency with override", () => {
			const fmt = resolveFormatter("currency", { currency: "EUR" }, undefined);
			const result = fmt(100);
			expect(result).toMatch(/€|EUR/);
		});

		it("accepts Intl options for date", () => {
			const fmt = resolveFormatter("date", { year: "numeric" }, undefined);
			const result = fmt("2026-06-02");
			expect(result).toMatch(/2026/);
		});
	});
});
