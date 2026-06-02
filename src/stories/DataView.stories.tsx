import { Button, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useMemo } from "react";
import { DataView } from "../components/DataView";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
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

/** State synced to the URL (`?page`/`sort`/`q`/`view`/`f.*`). Watch the address bar. */
export const WithUrlSync: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createMockFetcher(), []);
			// Memoize the adapter once, as consumers should.
			const adapter = useMemo(() => windowHistoryAdapter(), []);
			const view = useDataViewFetcher<Person>({
				columns,
				getRowId,
				fetcher,
				urlSync: { adapter },
			});
			return <DataView view={view} />;
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
