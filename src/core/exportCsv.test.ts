import { describe, expect, it, vi } from "vitest";
import { exportCsv } from "./exportCsv";

function mockTable(
	columns: { id: string; label: string; meta?: Record<string, unknown> }[],
	rows: Record<string, unknown>[],
) {
	const colObjects = columns.map((c) => ({
		id: c.id,
		columnDef: {
			header: c.label,
			meta: { label: c.label, ...c.meta },
		},
	}));
	return {
		getVisibleLeafColumns: () => colObjects,
		getRowModel: () => ({
			rows: rows.map((row, i) => ({
				id: String(i),
				getAllCells: () =>
					colObjects.map((col) => ({
						column: { id: col.id },
						getValue: () => row[col.id],
					})),
			})),
		}),
		// biome-ignore lint/suspicious/noExplicitAny: test mock
	} as any;
}

describe("exportCsv", () => {
	it("generates CSV with headers and rows", () => {
		let csvContent = "";
		const origBlob = globalThis.Blob;
		const origURL = globalThis.URL;

		globalThis.Blob = class MockBlob {
			constructor(parts: string[]) {
				csvContent = parts[0] as string;
			}
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		} as any;
		globalThis.URL.createObjectURL = () => "blob:mock";
		globalThis.URL.revokeObjectURL = vi.fn();

		const link = { href: "", download: "", click: vi.fn() };
		vi.spyOn(document, "createElement").mockReturnValue(
			link as unknown as HTMLElement,
		);

		const table = mockTable(
			[
				{ id: "name", label: "Name" },
				{ id: "age", label: "Age" },
			],
			[
				{ name: "Ada", age: 30 },
				{ name: "Linus", age: 55 },
			],
		);

		exportCsv(table);

		expect(csvContent).toBe("Name,Age\nAda,30\nLinus,55");
		expect(link.download).toBe("export.csv");
		expect(link.click).toHaveBeenCalled();

		globalThis.Blob = origBlob;
		globalThis.URL = origURL;
		vi.restoreAllMocks();
	});

	it("escapes values with commas and quotes", () => {
		let csvContent = "";
		const origBlob = globalThis.Blob;
		globalThis.Blob = class MockBlob {
			constructor(parts: string[]) {
				csvContent = parts[0] as string;
			}
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		} as any;
		globalThis.URL.createObjectURL = () => "blob:mock";
		globalThis.URL.revokeObjectURL = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			click: vi.fn(),
		} as unknown as HTMLElement);

		const table = mockTable(
			[{ id: "name", label: "Name" }],
			[{ name: 'O"Brien' }, { name: "Smith, Jr." }],
		);

		exportCsv(table);
		expect(csvContent).toContain('"O""Brien"');
		expect(csvContent).toContain('"Smith, Jr."');

		globalThis.Blob = origBlob;
		vi.restoreAllMocks();
	});

	it("filters out _select column", () => {
		let csvContent = "";
		const origBlob = globalThis.Blob;
		globalThis.Blob = class MockBlob {
			constructor(parts: string[]) {
				csvContent = parts[0] as string;
			}
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		} as any;
		globalThis.URL.createObjectURL = () => "blob:mock";
		globalThis.URL.revokeObjectURL = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			click: vi.fn(),
		} as unknown as HTMLElement);

		const table = mockTable(
			[
				{ id: "_select", label: "" },
				{ id: "name", label: "Name" },
			],
			[{ name: "Ada" }],
		);

		exportCsv(table);
		expect(csvContent).toBe("Name\nAda");

		globalThis.Blob = origBlob;
		vi.restoreAllMocks();
	});

	it("applies formatters when formatted option is true", () => {
		let csvContent = "";
		const origBlob = globalThis.Blob;
		globalThis.Blob = class MockBlob {
			constructor(parts: string[]) {
				csvContent = parts[0] as string;
			}
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		} as any;
		globalThis.URL.createObjectURL = () => "blob:mock";
		globalThis.URL.revokeObjectURL = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			click: vi.fn(),
		} as unknown as HTMLElement);

		const table = mockTable(
			[{ id: "active", label: "Active", meta: { dataType: "boolean" } }],
			[{ active: true }, { active: false }],
		);

		exportCsv(table, { formatted: true });
		expect(csvContent).toBe("Active\nYes\nNo");

		globalThis.Blob = origBlob;
		vi.restoreAllMocks();
	});

	it("uses custom separator", () => {
		let csvContent = "";
		const origBlob = globalThis.Blob;
		globalThis.Blob = class MockBlob {
			constructor(parts: string[]) {
				csvContent = parts[0] as string;
			}
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		} as any;
		globalThis.URL.createObjectURL = () => "blob:mock";
		globalThis.URL.revokeObjectURL = vi.fn();
		vi.spyOn(document, "createElement").mockReturnValue({
			href: "",
			download: "",
			click: vi.fn(),
		} as unknown as HTMLElement);

		const table = mockTable(
			[
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			],
			[{ a: "1", b: "2" }],
		);

		exportCsv(table, { separator: ";" });
		expect(csvContent).toBe("A;B\n1;2");

		globalThis.Blob = origBlob;
		vi.restoreAllMocks();
	});
});
