import { Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useMemo, useState } from "react";
import { DataView } from "../components/DataView";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
import { createColumnHelper, type DataColumnDef } from "../index";
import type { DataViewRequest, DataViewResponse } from "../types/request";
import { windowHistoryAdapter } from "../url";
import { columns, createMockFetcher, type Person } from "./data";

const meta: Meta = {
	title: "DataView",
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj;

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
	return <DataView view={view} />;
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
			return <DataView view={view} lockSwitcherOnMobile />;
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
				<DataView
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
					<DataView view={view} />
					<UrlReadout />
				</Stack>
			);
		}
		return <Example />;
	},
};

function UrlReadout() {
	const [search, setSearch] = useState(window.location.search);
	useEffect(() => {
		const update = () => setSearch(window.location.search);
		const id = setInterval(update, 300);
		return () => clearInterval(id);
	}, []);
	return (
		<Text size="xs" ff="monospace" c="dimmed">
			URL: {search || "(no query params)"}
		</Text>
	);
}

/** Bulk actions supplied by the consumer. Select rows to reveal the bar. */
export const BulkActions: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			const view = useDataViewFetcher<Person>({ columns, getRowId, fetcher });
			return (
				<DataView
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
					<DataView view={view} />
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
					<DataView view={view} />
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
						<DataView view={view} />
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

		const productCol = createColumnHelper<Product>();
		const productColumns = [
			productCol.accessor("name", {
				header: "Product",
				meta: {
					label: "Product",
					dataType: "text",
					card: { role: "title" },
					filter: { variant: "text" },
				},
			}),
			productCol.accessor("price", {
				header: "Price",
				meta: {
					label: "Price",
					dataType: "currency",
					align: "right",
					card: { role: "meta" },
					filter: { variant: "numberRange", min: 0, max: 600, step: 10 },
				},
			}),
			productCol.accessor("quantity", {
				header: "Quantity",
				meta: {
					label: "Quantity",
					dataType: "number",
					align: "right",
					card: { role: "meta" },
					filter: { variant: "numberRange", min: 0, max: 1500, step: 50 },
				},
			}),
			productCol.accessor("inStock", {
				header: "In Stock",
				meta: {
					label: "In Stock",
					dataType: "boolean",
					card: { role: "badge" },
					filter: { variant: "boolean" },
				},
			}),
			productCol.accessor("createdAt", {
				header: "Created",
				meta: {
					label: "Created",
					dataType: "date",
					card: { role: "meta" },
					filter: { variant: "dateRange" },
				},
			}),
		] satisfies DataColumnDef<Product>[];

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
			return <DataView view={view} />;
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
				<DataView
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
