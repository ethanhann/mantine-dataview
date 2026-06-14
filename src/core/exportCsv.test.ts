import { afterEach, describe, expect, it, vi } from "vitest";
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
				getValue: (columnId: string) => row[columnId],
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

/**
 * Stubs out Blob/URL/DOM so exportCsv can run headlessly, and captures the
 * generated CSV string. Returns the captured content + the fake anchor.
 */
function captureExport() {
	const state = { csv: "" };
	const origBlob = globalThis.Blob;
	globalThis.Blob = class MockBlob {
		constructor(parts: string[]) {
			state.csv = parts[0] as string;
		}
		// biome-ignore lint/suspicious/noExplicitAny: test mock
	} as any;
	globalThis.URL.createObjectURL = () => "blob:mock";
	globalThis.URL.revokeObjectURL = vi.fn();
	const link = { href: "", download: "", click: vi.fn() };
	vi.spyOn(document, "createElement").mockReturnValue(
		link as unknown as HTMLElement,
	);
	// The anchor is a plain object, not a real Node, so stub DOM insertion.
	vi.spyOn(document.body, "appendChild").mockImplementation(
		(node) => node as Node,
	);
	vi.spyOn(document.body, "removeChild").mockImplementation(
		(node) => node as Node,
	);
	return {
		get csv() {
			return state.csv;
		},
		link,
		restore() {
			globalThis.Blob = origBlob;
			vi.restoreAllMocks();
		},
	};
}

describe("exportCsv", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("generates CSV with headers and rows", () => {
		const cap = captureExport();
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

		expect(cap.csv).toBe("Name,Age\r\nAda,30\r\nLinus,55");
		expect(cap.link.download).toBe("export.csv");
		expect(cap.link.click).toHaveBeenCalled();
		cap.restore();
	});

	it("escapes values with commas and quotes", () => {
		const cap = captureExport();
		const table = mockTable(
			[{ id: "name", label: "Name" }],
			[{ name: 'O"Brien' }, { name: "Smith, Jr." }],
		);

		exportCsv(table);
		expect(cap.csv).toContain('"O""Brien"');
		expect(cap.csv).toContain('"Smith, Jr."');
		cap.restore();
	});

	it("filters out _select column", () => {
		const cap = captureExport();
		const table = mockTable(
			[
				{ id: "_select", label: "" },
				{ id: "name", label: "Name" },
			],
			[{ name: "Ada" }],
		);

		exportCsv(table);
		expect(cap.csv).toBe("Name\r\nAda");
		cap.restore();
	});

	it("applies formatters when formatted option is true", () => {
		const cap = captureExport();
		const table = mockTable(
			[{ id: "active", label: "Active", meta: { dataType: "boolean" } }],
			[{ active: true }, { active: false }],
		);

		exportCsv(table, { formatted: true });
		expect(cap.csv).toBe("Active\r\nYes\r\nNo");
		cap.restore();
	});

	it("uses custom separator and escapes values containing it", () => {
		const cap = captureExport();
		const table = mockTable(
			[
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			],
			[
				{ a: "1", b: "2" },
				{ a: "x;y", b: "z" },
			],
		);

		exportCsv(table, { separator: ";" });
		expect(cap.csv).toBe('A;B\r\n1;2\r\n"x;y";z');
		cap.restore();
	});

	it("neutralizes spreadsheet formula injection by default", () => {
		const cap = captureExport();
		const table = mockTable(
			[{ id: "name", label: "Name" }],
			[{ name: "=HYPERLINK(1)" }, { name: "+1+1" }, { name: "@SUM(A1)" }],
		);

		exportCsv(table);
		// Leading-quote prefix neutralizes the formula; the resulting value no
		// longer contains a quote/comma, so it is emitted unquoted.
		expect(cap.csv).toBe("Name\r\n'=HYPERLINK(1)\r\n'+1+1\r\n'@SUM(A1)");
		cap.restore();
	});

	it("can disable formula sanitization", () => {
		const cap = captureExport();
		const table = mockTable(
			[{ id: "name", label: "Name" }],
			[{ name: "=1+1" }],
		);

		exportCsv(table, { sanitizeFormulas: false });
		expect(cap.csv).toBe("Name\r\n=1+1");
		cap.restore();
	});

	it("serializes object and array values as JSON", () => {
		const cap = captureExport();
		const table = mockTable(
			[{ id: "tags", label: "Tags" }],
			[{ tags: ["a", "b"] }, { tags: { x: 1 } }],
		);

		exportCsv(table);
		expect(cap.csv).toBe('Tags\r\n"[""a"",""b""]"\r\n"{""x"":1}"');
		cap.restore();
	});

	it("appends a .csv extension when missing", () => {
		const cap = captureExport();
		const table = mockTable([{ id: "name", label: "Name" }], [{ name: "Ada" }]);

		exportCsv(table, { filename: "report" });
		expect(cap.link.download).toBe("report.csv");
		cap.restore();
	});

	it("does nothing when there are no exportable columns", () => {
		const cap = captureExport();
		const table = mockTable([{ id: "_select", label: "" }], [{ x: 1 }]);

		exportCsv(table);
		expect(cap.csv).toBe("");
		expect(cap.link.click).not.toHaveBeenCalled();
		cap.restore();
	});
});
