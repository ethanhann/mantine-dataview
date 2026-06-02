// Card grid presentation. It is the second projection of the same core state. It reads the
// identical sorting, selection, visibility, and pagination as `<DataTable>`, then renders that
// as Mantine cards through the composition helper. Card fields come from
// `getVisibleLeafColumns()`, so hiding a column hides its card field too. Parity holds by design.

import {
	Box,
	Card,
	Center,
	Checkbox,
	Group,
	SimpleGrid,
	type SimpleGridProps,
	Skeleton,
	Stack,
	Text,
} from "@mantine/core";
import { flexRender, type Row } from "@tanstack/react-table";
import { Fragment, type ReactNode } from "react";
import {
	type CardField,
	type ComposeCardOptions,
	composeCardLayout,
} from "../../core/cardComposition";
import type { UseDataViewReturn } from "../../types/options";
import { EmptyContent, ErrorContent } from "../StateMessage";
import type { DataViewSlots } from "../types";

const DEFAULT_COLS: SimpleGridProps["cols"] = { base: 1, sm: 2, lg: 3 };

export interface DataCardsProps<TData>
	extends Omit<SimpleGridProps, "children"> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	slots?: DataViewSlots<TData>;
	/** Full per card escape hatch. It replaces the default composition. */
	renderCard?: (ctx: {
		row: Row<TData>;
		data: TData;
		selected: boolean;
		toggleSelected: () => void;
	}) => ReactNode;
	/** Role for accessor columns that declare none. It is forwarded to the composition. */
	fallbackRole?: ComposeCardOptions["fallbackRole"];
	enableSelection?: boolean;
	/** Skeleton cards shown while loading. It defaults to the current page size, capped at 6. */
	loadingCardCount?: number;
}

export function DataCards<TData>({
	view,
	slots,
	renderCard,
	fallbackRole,
	enableSelection,
	loadingCardCount,
	cols = DEFAULT_COLS,
	...gridProps
}: DataCardsProps<TData>) {
	const { table, renderStatus } = view;
	const selectionEnabled =
		enableSelection ?? table.options.enableRowSelection !== false;
	const skeletonCards =
		loadingCardCount ?? Math.min(view.state.pagination.pageSize, 6);
	const grid = { cols, ...gridProps };

	switch (renderStatus.phase) {
		case "loading":
			return slots?.LoadingCards ? (
				slots.LoadingCards()
			) : (
				<SimpleGrid {...grid}>
					{Array.from({ length: skeletonCards }, (_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: placeholders of a fixed count
						<Card key={i} withBorder padding="md">
							<Stack gap="xs">
								<Skeleton height={20} width="60%" />
								<Skeleton height={12} width="40%" />
								<Skeleton height={12} />
							</Stack>
						</Card>
					))}
				</SimpleGrid>
			);
		case "error":
			return (
				<Center p="xl">
					<ErrorContent view={view} slots={slots} />
				</Center>
			);
		case "empty":
		case "empty-filtered":
			return (
				<Center p="xl">
					<EmptyContent view={view} slots={slots} />
				</Center>
			);
		default: {
			const layout = composeCardLayout(table, { fallbackRole });
			return (
				<SimpleGrid {...grid}>
					{table.getRowModel().rows.map((row) => {
						const selected = row.getIsSelected();
						const toggleSelected = () => row.toggleSelected();
						const ctx = { row, data: row.original, selected, toggleSelected };

						if (renderCard) {
							return <CardKey key={row.id}>{renderCard(ctx)}</CardKey>;
						}

						const body = (
							<DefaultCardBody
								row={row}
								layout={layout}
								selectionEnabled={selectionEnabled}
							/>
						);
						if (slots?.Card) {
							return (
								<CardKey key={row.id}>
									{slots.Card({ ...ctx, children: body })}
								</CardKey>
							);
						}
						return (
							<Card
								key={row.id}
								withBorder
								padding="lg"
								pos="relative"
								data-selected={selected || undefined}
							>
								{body}
							</Card>
						);
					})}
				</SimpleGrid>
			);
		}
	}
}

/** Carries the React key for a card element the consumer supplies. */
function CardKey({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

function DefaultCardBody<TData>({
	row,
	layout,
	selectionEnabled,
}: {
	row: Row<TData>;
	layout: ReturnType<typeof composeCardLayout<TData>>;
	selectionEnabled: boolean;
}) {
	const cellById = new Map(row.getAllCells().map((c) => [c.column.id, c]));
	const renderField = (field: CardField<TData>): ReactNode => {
		const cell = cellById.get(field.id);
		return cell
			? flexRender(cell.column.columnDef.cell, cell.getContext())
			: null;
	};

	return (
		<>
			{selectionEnabled && (
				<Checkbox
					aria-label="Select card"
					checked={row.getIsSelected()}
					disabled={!row.getCanSelect()}
					onChange={row.getToggleSelectedHandler()}
					style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
				/>
			)}
			{layout.media.length > 0 && (
				<Card.Section mb="xs">
					{layout.media.map((field) => (
						<Box key={field.id}>{renderField(field)}</Box>
					))}
				</Card.Section>
			)}
			<Stack gap="md">
				{(layout.title.length > 0 || layout.subtitle.length > 0) && (
					<Stack gap={4}>
						{layout.title.map((field) => (
							<Text
								key={field.id}
								fw={600}
								size="lg"
								lh={1.2}
								pr={selectionEnabled ? 28 : 0}
							>
								{renderField(field)}
							</Text>
						))}
						{layout.subtitle.map((field) => (
							<Text key={field.id} size="sm" c="dimmed">
								{renderField(field)}
							</Text>
						))}
					</Stack>
				)}
				{layout.badge.length > 0 && (
					<Group gap="xs">
						{layout.badge.map((field) => (
							<Fragment key={field.id}>{renderField(field)}</Fragment>
						))}
					</Group>
				)}
				{layout.meta.length > 0 && (
					<Stack gap={4}>
						{layout.meta.map((field) => (
							<Group
								key={field.id}
								justify="space-between"
								gap="xs"
								wrap="nowrap"
							>
								{field.showLabel && (
									<Text size="sm" c="dimmed">
										{field.label}
									</Text>
								)}
								<Text size="sm">{renderField(field)}</Text>
							</Group>
						))}
					</Stack>
				)}
			</Stack>
		</>
	);
}
