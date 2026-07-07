import {
	Badge,
	Button,
	Group,
	Loader,
	Select,
	Stack,
	Switch,
	Text,
	TextInput,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useMemo, useRef, useState } from "react";
import { ViewSwitcher } from "../components/DataToolbar";
import { DataViewer } from "../components/DataViewer";
import { useDataViewFetcher } from "../core/state/useDataViewFetcher";
import {
	col,
	createColumnHelper,
	type DataColumnDef,
	localStorageAdapter,
} from "../index";
import { createMockFetcher as createTestFetcher } from "../testing";
import type { FacetData } from "../types/facets";
import type { DataViewRequest, DataViewResponse } from "../types/request";
import { windowHistoryAdapter } from "../url";
import { columns, createMockFetcher, type Person, people } from "./data";
import { UrlReadout } from "./UrlReadout";

/**
 * `DataViewer` renders server-driven, paginated datasets as either a table or a card grid,
 * switchable at runtime. It composes a toolbar, bulk actions bar, the active presentation,
 * and pagination into a single orchestrator. All features are driven by the `useDataViewFetcher`
 * hook, which manages the fetch lifecycle and emits a `UseDataViewReturn` object.
 */
const meta: Meta<typeof DataViewer> = {
	title: "DataViewer",
	component: DataViewer,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataViewer>;

const getRowId = (p: Person) => p.id;

/** The headline experience. One component, driven by the server, switchable between table and cards. */
function Showcase(props: { defaultView?: "table" | "cards" }) {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
		defaultView: props.defaultView,
	});
	return <DataViewer view={view} />;
}

export const Default: Story = {
	render: () => <Showcase />,
};

export const CardsByDefault: Story = {
	render: () => <Showcase defaultView="cards" />,
};

/** Below `sm`, the view is forced to cards and the switcher locks. Resize the viewport. */
export const ResponsiveForceCards: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				responsive: { forceCardsBelow: "sm", lockSwitcherOnMobile: true },
			});
			return <DataViewer view={view} lockSwitcherOnMobile />;
		}
		return <Example />;
	},
	parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** Full control over card content via `renderCard`. */
export const CustomRenderCard: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				defaultView: "cards",
			});
			return (
				<DataViewer
					view={view}
					renderCard={({ data, selected, toggleSelected }) => (
						<Stack
							gap={4}
							p="md"
							style={{
								border: "1px solid var(--mantine-color-default-border)",
								borderRadius: 8,
								background: selected
									? "var(--mantine-color-blue-light)"
									: undefined,
							}}
							onClick={toggleSelected}
						>
							<Text fw={700}>{data.name}</Text>
							<Text size="sm" c="dimmed">
								{data.role} · {data.location}
							</Text>
						</Stack>
					)}
				/>
			);
		}
		return <Example />;
	},
};

/** State synced to the URL. In Storybook the iframe URL is not visible in the address bar, so a live readout is shown below. */
export const WithUrlSync: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const adapter = useMemo(() => windowHistoryAdapter(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				urlSync: { adapter },
			});
			return (
				<Stack gap="xs">
					<DataViewer view={view} />
					<UrlReadout />
				</Stack>
			);
		}
		return <Example />;
	},
};

/**
 * `historyMode: "push"` creates a new history entry for each filter/sort/page change, so browser
 * back/forward steps through them (the default `"replace"` keeps one entry). The buttons drive the
 * iframe's own history since the Storybook address bar isn't the iframe's.
 */
export const UrlSyncPushHistory: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const adapter = useMemo(() => windowHistoryAdapter(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				urlSync: { adapter, historyMode: "push" },
			});
			return (
				<Stack gap="xs">
					<Group gap="xs">
						<Button
							size="xs"
							variant="default"
							onClick={() => window.history.back()}
						>
							← Back
						</Button>
						<Button
							size="xs"
							variant="default"
							onClick={() => window.history.forward()}
						>
							Forward →
						</Button>
						<Text size="xs" c="dimmed">
							Change a filter, sort, or page, then step through the entries.
						</Text>
					</Group>
					<DataViewer view={view} />
					<UrlReadout />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Bulk actions supplied by the consumer. Select rows to reveal the bar. */
export const BulkActions: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({ columns, getRowId, fetcher });
			return (
				<DataViewer
					view={view}
					slots={{
						BulkActions: (selection) => (
							<Button
								size="xs"
								color="red"
								variant="light"
								onClick={() => {
									window.alert(`Delete ${selection.ids.join(", ")}`);
									selection.clear();
								}}
							>
								Delete {selection.count}
							</Button>
						),
					}}
				/>
			);
		}
		return <Example />;
	},
};

/** Multi-sort: Shift+click column headers to add secondary sort keys. */
export const MultiSort: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				initialState: {
					sorting: [
						{ id: "role", desc: false },
						{ id: "name", desc: false },
					],
				},
			});
			return (
				<Stack gap="xs">
					<Text size="sm" c="dimmed">
						Sorted by Role then Name. Shift+click headers to adjust multi-sort.
					</Text>
					<DataViewer view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** CSV export button wired to view.exportCsv(). */
export const CsvExport: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({ columns, getRowId, fetcher });
			return (
				<Stack gap="xs">
					<Group>
						<Button
							variant="default"
							size="xs"
							onClick={() => view.exportCsv({ filename: "users.csv" })}
						>
							Export CSV
						</Button>
					</Group>
					<DataViewer view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Column pinning: Name pinned left, Location pinned right. Scroll horizontally to see the effect. */
export const ColumnPinning: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				initialState: {
					columnPinning: { left: ["name"], right: ["location"] },
				},
			});
			return (
				<Stack gap="xs">
					<Text size="sm" c="dimmed">
						Name is pinned left, Location is pinned right. Use the Columns menu
						to change pinning, or scroll horizontally to see the sticky
						behavior.
					</Text>
					<div style={{ maxWidth: 600 }}>
						<DataViewer view={view} />
					</div>
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Demonstrates all five data types with automatic formatting. */
export const DataTypes: Story = {
	render: () => {
		interface Product {
			id: string;
			name: string;
			price: number;
			quantity: number;
			inStock: boolean;
			createdAt: string;
		}

		const productColumns = col<Product>()
			.text("name", { header: "Product", card: "title" })
			.currency("price", {
				card: "meta",
				width: 120,
				filter: { min: 0, max: 600, step: 10 },
			})
			.number("quantity", {
				card: "meta",
				width: 120,
				filter: { min: 0, max: 1500, step: 50 },
			})
			.boolean("inStock", { card: "badge", width: 100 })
			.date("createdAt", { card: "meta", width: 160 })
			.build();

		const products: Product[] = [
			{
				id: "1",
				name: "Mechanical Keyboard",
				price: 149.99,
				quantity: 1250,
				inStock: true,
				createdAt: "2025-11-15",
			},
			{
				id: "2",
				name: "Ergonomic Mouse",
				price: 79.5,
				quantity: 843,
				inStock: true,
				createdAt: "2026-01-03",
			},
			{
				id: "3",
				name: "USB-C Hub",
				price: 45,
				quantity: 0,
				inStock: false,
				createdAt: "2024-06-22",
			},
			{
				id: "4",
				name: '27" Monitor',
				price: 399.99,
				quantity: 312,
				inStock: true,
				createdAt: "2026-03-10",
			},
			{
				id: "5",
				name: "Webcam HD",
				price: 59.95,
				quantity: 0,
				inStock: false,
				createdAt: "2025-08-01",
			},
			{
				id: "6",
				name: "Standing Desk",
				price: 599,
				quantity: 87,
				inStock: true,
				createdAt: "2026-05-18",
			},
		];

		function field(p: Product, id: string): string | number | boolean {
			return p[id as keyof Product] as string | number | boolean;
		}

		function Example() {
			const fetcher = useMemo(
				() =>
					async (req: DataViewRequest): Promise<DataViewResponse<Product>> => {
						await new Promise((r) => setTimeout(r, 300));
						let result = products.slice();

						if (req.globalFilter) {
							const q = req.globalFilter.toLowerCase();
							result = result.filter((p) => p.name.toLowerCase().includes(q));
						}
						for (const f of req.filters) {
							result = result.filter((p) => {
								const v = f.value;
								if (v == null || v === "") return true;
								if (f.id === "price" || f.id === "quantity") {
									if (!Array.isArray(v)) return true;
									const [min, max] = v as [number | null, number | null];
									const cell = field(p, f.id) as number;
									return (
										(min == null || cell >= min) && (max == null || cell <= max)
									);
								}
								if (f.id === "inStock") return p.inStock === v;
								const cell = String(field(p, f.id)).toLowerCase();
								return cell.includes(String(v).toLowerCase());
							});
						}

						if (req.sorting.length > 0) {
							result.sort((a, b) => {
								for (const sort of req.sorting) {
									const av = field(a, sort.id);
									const bv = field(b, sort.id);
									if (av === bv) continue;
									const cmp = av < bv ? -1 : 1;
									return sort.desc ? -cmp : cmp;
								}
								return 0;
							});
						}

						const total = result.length;
						const { pageIndex, pageSize } = req.pagination;
						const start = pageIndex * pageSize;
						return {
							rows: result.slice(start, start + pageSize),
							rowCount: total,
						};
					},
				[],
			);
			const view = useDataViewFetcher<Product>({
				columns: productColumns,
				getRowId: (p) => p.id,
				fetcher,
				formatDefaults: {
					currency: { currency: "USD" },
					date: { dateStyle: "medium" },
				},
			});
			return <DataViewer view={view} />;
		}
		return <Example />;
	},
};

/** Dark color scheme. Use the mirror icon in Storybook's toolbar to toggle globally. */
export const DarkMode: Story = {
	globals: { colorScheme: "dark" },
	render: () => <Showcase />,
};

/** Custom empty/error slots. This story uses a fetcher that always fails. */
export const CustomStates: Story = {
	render: () => {
		function Example() {
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher: async () => {
					throw new Error("Simulated outage");
				},
			});
			return (
				<DataViewer
					view={view}
					slots={{
						ErrorState: ({ retry }) => (
							<Stack align="center" gap="xs">
								<Text c="orange">The server is unavailable.</Text>
								<Button size="xs" onClick={retry}>
									Try again
								</Button>
							</Stack>
						),
					}}
				/>
			);
		}
		return <Example />;
	},
};

/** Faceted search with dynamic counts. Filter one dimension and watch counts update on others. */
export const FacetedSearch: Story = {
	render: () => {
		type Size = "XS" | "S" | "M" | "L" | "XL";
		interface Shirt {
			id: string;
			name: string;
			size: Size;
			price: number;
			inStock: boolean;
		}

		const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
		const NAMES = [
			"Classic Tee",
			"V-Neck",
			"Henley",
			"Polo",
			"Tank Top",
			"Long Sleeve",
			"Raglan",
			"Crew Neck",
			"Slim Fit",
			"Oversized",
			"Pocket Tee",
			"Graphic Tee",
			"Striped",
			"Linen Blend",
			"Performance",
			"Vintage Wash",
			"Organic Cotton",
			"Jersey Knit",
			"Thermal",
			"Muscle Tee",
		];
		const shirts: Shirt[] = NAMES.map((name, i) => ({
			id: String(i + 1),
			name,
			size: SIZES[i % SIZES.length] as Size,
			price: 15 + ((i * 13) % 85),
			inStock: i % 3 !== 0,
		}));

		const shirtCol = createColumnHelper<Shirt>();
		const shirtColumns = [
			shirtCol.accessor("name", {
				header: "Name",
				meta: {
					label: "Name",
					dataType: "text",
					card: { role: "title" },
					filter: { variant: "text" },
				},
			}),
			shirtCol.accessor("size", {
				header: "Size",
				meta: {
					label: "Size",
					card: { role: "badge" },
					filter: {
						variant: "select",
						options: SIZES.map((s) => ({ value: s, label: s })),
					},
				},
			}),
			shirtCol.accessor("price", {
				header: "Price",
				meta: {
					label: "Price",
					dataType: "currency",
					align: "right",
					card: { role: "meta" },
					filter: { variant: "numberRange" },
				},
			}),
			shirtCol.accessor("inStock", {
				header: "In Stock",
				meta: {
					label: "In Stock",
					dataType: "boolean",
					card: { role: "badge" },
					filter: { variant: "boolean" },
				},
			}),
		] satisfies DataColumnDef<Shirt>[];

		function computeFacets(filtered: Shirt[]): Record<string, FacetData> {
			const sizeCounts = new Map<string, number>();
			for (const s of SIZES) sizeCounts.set(s, 0);
			const stockCounts = { true: 0, false: 0 };
			for (const s of filtered) {
				sizeCounts.set(s.size, (sizeCounts.get(s.size) ?? 0) + 1);
				stockCounts[String(s.inStock) as "true" | "false"]++;
			}
			return {
				size: {
					type: "values",
					values: SIZES.map((s) => ({
						value: s,
						label: s,
						count: sizeCounts.get(s) ?? 0,
					})),
				},
				price: {
					type: "ranges",
					ranges: [
						{
							label: "Under $25",
							from: 0,
							to: 25,
							count: filtered.filter((s) => s.price < 25).length,
						},
						{
							label: "$25–$50",
							from: 25,
							to: 50,
							count: filtered.filter((s) => s.price >= 25 && s.price < 50)
								.length,
						},
						{
							label: "$50–$75",
							from: 50,
							to: 75,
							count: filtered.filter((s) => s.price >= 50 && s.price < 75)
								.length,
						},
						{
							label: "$75+",
							from: 75,
							to: 999,
							count: filtered.filter((s) => s.price >= 75).length,
						},
					],
					min: 15,
					max: 99,
				},
				inStock: {
					type: "values",
					values: [
						{ value: "true", label: "Yes", count: stockCounts.true },
						{ value: "false", label: "No", count: stockCounts.false },
					],
				},
			};
		}

		function Example() {
			const fetcher = useMemo(
				() =>
					async (req: DataViewRequest): Promise<DataViewResponse<Shirt>> => {
						await new Promise((r) => setTimeout(r, 200));
						let result = shirts.slice();

						if (req.globalFilter) {
							const q = req.globalFilter.toLowerCase();
							result = result.filter((s) => s.name.toLowerCase().includes(q));
						}
						for (const f of req.filters) {
							result = result.filter((s) => {
								const v = f.value;
								if (v == null || v === "") return true;
								if (f.id === "price" && Array.isArray(v)) {
									const [lo, hi] = v as [number, number];
									return s.price >= lo && s.price < hi;
								}
								if (f.id === "inStock") return s.inStock === v;
								if (f.id === "size") return s.size === v;
								return String(s[f.id as keyof Shirt])
									.toLowerCase()
									.includes(String(v).toLowerCase());
							});
						}

						if (req.sorting.length > 0) {
							result.sort((a, b) => {
								for (const sort of req.sorting) {
									const av = a[sort.id as keyof Shirt];
									const bv = b[sort.id as keyof Shirt];
									if (av === bv) continue;
									const cmp = av < bv ? -1 : 1;
									return sort.desc ? -cmp : cmp;
								}
								return 0;
							});
						}

						const facets = computeFacets(result);
						const total = result.length;
						const { pageIndex, pageSize } = req.pagination;
						const start = pageIndex * pageSize;
						return {
							rows: result.slice(start, start + pageSize),
							rowCount: total,
							facets,
						};
					},
				[],
			);

			const view = useDataViewFetcher<Shirt>({
				columns: shirtColumns,
				getRowId: (s) => s.id,
				fetcher,
				formatDefaults: { currency: { currency: "USD" } },
			});

			return (
				<Stack gap="xs">
					<Text size="sm" c="dimmed">
						Filter by size, price range, or stock status. Watch the counts
						update on other filters as you narrow your selection.
					</Text>
					<DataViewer view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** External parameters: tenant selector and archive toggle outside the DataViewer. */
export const ExternalParams: Story = {
	render: () => {
		function Example() {
			const [tenant, setTenant] = useState("acme");
			const [showArchived, setShowArchived] = useState(false);

			const fetcher = useMemo(() => createMockFetcher(), []);

			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				params: { tenant, showArchived },
			});

			return (
				<Stack gap="md">
					<Text size="sm" c="dimmed">
						These controls are outside the DataView. Changing them triggers a
						refetch with the new params visible in request.params.
					</Text>
					<Group>
						<Select
							label="Tenant"
							data={["acme", "globex", "initech"]}
							value={tenant}
							onChange={(v) => setTenant(v ?? "acme")}
						/>
						<Switch
							label="Show archived"
							checked={showArchived}
							onChange={(e) => setShowArchived(e.currentTarget.checked)}
							mt={24}
						/>
					</Group>
					<DataViewer view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Toolbar sections: inject an export button and refresh button without rebuilding the toolbar. */
export const ToolbarSections: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
			});
			return (
				<DataViewer view={view}>
					<DataViewer.Toolbar
						leftSection={
							<Text fw={600} size="lg">
								Users
							</Text>
						}
						rightSection={
							<Group gap="xs">
								<Button
									variant="default"
									size="xs"
									onClick={() => view.exportCsv({ filename: "users.csv" })}
								>
									Export
								</Button>
								<Button size="xs" onClick={() => view.refetch()}>
									Refresh
								</Button>
							</Group>
						}
					/>
					<DataViewer.Body />
					<DataViewer.Pagination />
				</DataViewer>
			);
		}
		return <Example />;
	},
};

/** Animated rows: sort or filter to see rows enter/exit with transitions instead of skeletons. */
export const AnimatedRows: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
			});
			return (
				<Stack gap="xs">
					<Text size="sm" c="dimmed">
						Sort or filter to see rows animate in and out. No skeleton flash.
					</Text>
					<DataViewer view={view} animateRows />
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Standalone ViewSwitcher with custom labels, placed outside the toolbar. */
export const CustomViewSwitcher: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
			});
			return (
				<Stack gap="md">
					<Group justify="space-between">
						<Text fw={600} size="lg">
							Users
						</Text>
						<ViewSwitcher
							view={view}
							tableLabel="List View"
							cardsLabel="Grid View"
						/>
					</Group>
					<DataViewer view={view}>
						<DataViewer.Toolbar showViewSwitcher={false} />
						<DataViewer.Body />
						<DataViewer.Pagination />
					</DataViewer>
				</Stack>
			);
		}
		return <Example />;
	},
};

/** Optimistic reconciliation: patch, insert, and remove rows without a full reload. */
export const OptimisticReconciliation: Story = {
	render: () => {
		function Example() {
			const nextIdRef = useRef(100);
			const serverDataRef = useRef([...people]);

			const fetcher = useCallback(
				async (request: DataViewRequest): Promise<DataViewResponse<Person>> => {
					await new Promise((r) => setTimeout(r, 800));
					let result = serverDataRef.current.slice();

					if (request.globalFilter) {
						const q = request.globalFilter.toLowerCase();
						result = result.filter(
							(p) =>
								p.name.toLowerCase().includes(q) ||
								p.email.toLowerCase().includes(q),
						);
					}
					for (const f of request.filters) {
						result = result.filter((p) => {
							const cell = p[f.id as keyof Person];
							if (f.value == null || f.value === "") return true;
							if (Array.isArray(f.value))
								return f.value.length === 0 || f.value.includes(cell);
							return String(cell)
								.toLowerCase()
								.includes(String(f.value).toLowerCase());
						});
					}
					if (request.sorting.length > 0) {
						result.sort((a, b) => {
							for (const sort of request.sorting) {
								const av = a[sort.id as keyof Person];
								const bv = b[sort.id as keyof Person];
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
					return {
						rows: result.slice(start, start + pageSize),
						rowCount: total,
					};
				},
				[],
			);

			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				revalidateDelay: 1500,
			});

			const [newName, setNewName] = useState("");

			const handlePatchFirst = () => {
				const rows = view.table.getRowModel().rows;
				if (rows.length === 0) return;
				const first = rows[0]!.original;
				const patched = {
					...first,
					name: `${first.name} (edited)`,
					status: "invited" as const,
				};
				serverDataRef.current = serverDataRef.current.map((p) =>
					p.id === patched.id ? patched : p,
				);
				view.patchRow(patched);
			};

			const handleInsert = () => {
				const id = String(nextIdRef.current++);
				const name = newName.trim() || `New Person ${id}`;
				const record: Person = {
					id,
					name,
					email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`,
					role: "Engineer",
					status: "active",
					age: 30,
					location: "Austin",
					hiredAt: "2026-07-01",
				};
				serverDataRef.current = [record, ...serverDataRef.current];
				view.insertRow(record);
				setNewName("");
			};

			const handleDeleteFirst = () => {
				const rows = view.table.getRowModel().rows;
				if (rows.length === 0) return;
				const id = rows[0]!.id;
				serverDataRef.current = serverDataRef.current.filter(
					(p) => p.id !== id,
				);
				view.removeRow(id);
			};

			return (
				<Stack gap="md">
					<Text size="sm" c="dimmed">
						These buttons simulate a detail panel saving, creating, and deleting
						records. Changes appear instantly (optimistic), then a background
						revalidation fetch fires after 1.5s to reconcile with server truth.
						Watch the sync indicator.
					</Text>

					<Group>
						<Button size="xs" variant="light" onClick={handlePatchFirst}>
							Edit first row
						</Button>
						<Button
							size="xs"
							variant="light"
							color="red"
							onClick={handleDeleteFirst}
						>
							Delete first row
						</Button>
						<TextInput
							size="xs"
							placeholder="Name for new person"
							value={newName}
							onChange={(e) => setNewName(e.currentTarget.value)}
							onKeyDown={(e) => e.key === "Enter" && handleInsert()}
						/>
						<Button
							size="xs"
							variant="light"
							color="green"
							onClick={handleInsert}
						>
							Create
						</Button>
						{view.isRevalidating && (
							<Badge
								variant="light"
								color="yellow"
								leftSection={<Loader size={10} color="yellow" />}
							>
								Syncing...
							</Badge>
						)}
					</Group>

					<DataViewer view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/**
 * Every built-in string routes through the `labels` dictionary, merged over the English defaults.
 * This table is fully German: toolbar, filters, selection, bulk bar, states, and pagination.
 * Functions cover parameterized text such as the selected count and the pagination range.
 */
function LocalizationExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
		labels: {
			searchPlaceholder: "Suchen…",
			search: "Suche",
			clearSearch: "Suche löschen",
			filters: "Filter",
			filtersWithCount: (count) => `Filter (${count})`,
			resetFilters: "Filter zurücksetzen",
			clearFilter: "löschen",
			sortBy: "Sortieren nach",
			toggleSortDirection: "Sortierrichtung umschalten",
			columns: "Spalten",
			view: "Ansicht",
			tableView: "Tabelle",
			cardsView: "Karten",
			filterAll: "Alle",
			filterYes: "Ja",
			filterNo: "Nein",
			filterMin: "Min",
			filterMax: "Max",
			selectRow: "Zeile auswählen",
			selectAllRows: "Alle Zeilen dieser Seite auswählen",
			selectCard: "Karte auswählen",
			selectedCount: (count) => `${count} ausgewählt`,
			clearSelection: "Aufheben",
			bulkActions: "Massenaktionen",
			noResults: "Keine Ergebnisse.",
			noMatches: "Keine Treffer.",
			clearFilters: "Filter löschen",
			errorMessage: "Etwas ist schiefgelaufen.",
			retry: "Erneut versuchen",
			rowsPerPage: "Zeilen pro Seite",
			paginationRange: (start, end, total) =>
				`${start} bis ${end} von ${total}`,
		},
	});
	return <DataViewer view={view} />;
}

export const Localization: Story = { render: () => <LocalizationExample /> };

/**
 * `keepPreviousData` keeps the previous rows on screen during a refetch instead of swapping to
 * skeletons; the toolbar shows a small sync loader while the fetch is in flight. Change the page
 * or a filter and watch the old rows stay until the new ones land (the mock server takes 1.2s).
 */
function KeepPreviousDataExample() {
	const fetcher = useMemo(() => createMockFetcher(undefined, 1200), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
		keepPreviousData: true,
	});
	return <DataViewer view={view} />;
}

export const KeepPreviousData: Story = {
	render: () => <KeepPreviousDataExample />,
};

/**
 * Layout preferences persist across sessions through a storage adapter. Hide a column, pin or
 * resize one, reorder via the Columns menu, or change the page size, then reload the page: the
 * choices come back. Ephemeral state (page, sort, filters, search) intentionally does not.
 */
function PersistenceExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const persist = useMemo(
		() => ({ adapter: localStorageAdapter("storybook-dataview-prefs") }),
		[],
	);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
		persist,
		enableColumnResizing: true,
	});
	return <DataViewer view={view} />;
}

export const PreferencePersistence: Story = {
	render: () => <PersistenceExample />,
};

/**
 * Server-computed aggregates: the response's `summary` (keyed by column id, raw values) renders
 * as a table footer row and, in card view, a summary block. Values format by the column's
 * `dataType`. The aggregates recompute over the filtered set, so filtering updates them.
 */
function SummaryExample() {
	const fetcher = useMemo(
		() =>
			createTestFetcher(people, {
				latency: 400,
				summary: (rows) => ({
					name: `${rows.length} people`,
					age:
						rows.length === 0
							? 0
							: Math.round(rows.reduce((n, p) => n + p.age, 0) / rows.length),
				}),
			}),
		[],
	);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
	});
	return <DataViewer view={view} />;
}

export const SummaryAggregates: Story = { render: () => <SummaryExample /> };

/**
 * Column order is state: seed it with `initialState.columnOrder` and let users move columns with
 * the up/down buttons in the Columns menu. The order persists through the preference adapter.
 */
function ReorderingExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
		initialState: { columnOrder: ["status", "name", "email"] },
	});
	return (
		<Stack gap="sm">
			<Text size="sm" c="dimmed">
				Order: {view.state.columnOrder.join(" → ") || "definition order"}
			</Text>
			<DataViewer view={view} />
		</Stack>
	);
}

export const ColumnReordering: Story = { render: () => <ReorderingExample /> };

/**
 * Exporting: `exportCsv`/`exportJson` download the current page client-side, while
 * `view.exportRequest` (the request minus pagination) is what a backend export-all endpoint
 * needs to reproduce the full filtered set. Filter or search, then inspect the request.
 */
function ExportAllExample() {
	const fetcher = useMemo(() => createMockFetcher(), []);
	const view = useDataViewFetcher<Person>({
		columns,
		getRowId,
		fetcher,
	});
	return (
		<Stack gap="sm">
			<Group gap="xs">
				<Button size="xs" variant="default" onClick={() => view.exportCsv()}>
					Export page (CSV)
				</Button>
				<Button size="xs" variant="default" onClick={() => view.exportJson()}>
					Export page (JSON)
				</Button>
				<Button
					size="xs"
					onClick={() =>
						// A real app posts this to its export endpoint instead.
						alert(JSON.stringify(view.exportRequest, null, 2))
					}
				>
					Export all (request)
				</Button>
			</Group>
			<DataViewer view={view} />
		</Stack>
	);
}

export const ExportAll: Story = { render: () => <ExportAllExample /> };
