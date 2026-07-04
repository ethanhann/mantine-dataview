// Filter surface. Up to `inlineThreshold` filterable columns render inline on desktop. Beyond
// that they collapse into a popover. On mobile, filters open in a bottom drawer.

import {
	Button,
	CloseIcon,
	Drawer,
	Group,
	type MantineSize,
	Popover,
	Stack,
	useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { belowBreakpointQuery } from "../../core/useForceCards";
import type { DataViewLabels } from "../../types/labels";
import type { UseDataViewReturn } from "../../types/options";
import { FilterIcon } from "../icons";
import { FilterControl } from "./FilterControl";

function ClearFiltersButton<TData>({
	view,
}: {
	view: UseDataViewReturn<TData>;
}) {
	const active = view.state.columnFilters.length > 0;
	if (!active) return null;
	return (
		<Button
			style={{ alignSelf: "flex-end" }}
			variant="subtle"
			color="gray"
			leftSection={<CloseIcon size="16" />}
			onClick={() => view.table.resetColumnFilters()}
		>
			{view.labels.resetFilters}
		</Button>
	);
}

function filterButtonLabel(
	labels: DataViewLabels,
	activeCount: number,
): string {
	return activeCount > 0
		? labels.filtersWithCount(activeCount)
		: labels.filters;
}

function FilterStack<TData>({
	view,
	controls,
}: {
	view: UseDataViewReturn<TData>;
	controls: React.ReactNode;
}) {
	return (
		<Stack gap="sm" style={{ minWidth: 240 }}>
			{controls}
			<Group justify="flex-end">
				<ClearFiltersButton view={view} />
			</Group>
		</Stack>
	);
}

/**
 * Resolves how the filter surface renders for the current viewport and column count. Shared so the
 * toolbar can reserve matching label space on its other controls only when filters render inline
 * (and therefore show a label above each input).
 */
export function useFilterLayout<TData>(
	view: UseDataViewReturn<TData>,
	inlineThreshold: number,
) {
	const theme = useMantineTheme();
	const isMobile = useMediaQuery(
		belowBreakpointQuery(theme.breakpoints.sm),
		false,
	);
	const columns = view.filterableColumns;
	const isInline =
		!isMobile && columns.length > 0 && columns.length <= inlineThreshold;
	return { isMobile, columns, isInline };
}

export function FilterControls<TData>({
	view,
	inlineThreshold,
	disabled,
	size = "xs",
}: {
	view: UseDataViewReturn<TData>;
	inlineThreshold: number;
	disabled?: boolean;
	size?: MantineSize;
}) {
	const { isMobile, columns, isInline } = useFilterLayout(
		view,
		inlineThreshold,
	);
	const [modalOpen, { open, close }] = useDisclosure(false);

	if (columns.length === 0) return null;

	const controls = columns.map((column) => (
		<FilterControl
			key={column.id}
			column={column}
			facet={view.facets[column.id]}
			disabled={disabled}
			size={size}
			labels={view.labels}
		/>
	));
	const activeCount = view.state.columnFilters.length;

	if (isMobile) {
		return (
			<>
				<Button
					variant="default"
					leftSection={<FilterIcon />}
					onClick={open}
					disabled={disabled}
					aria-haspopup="dialog"
					aria-expanded={modalOpen}
				>
					{filterButtonLabel(view.labels, activeCount)}
				</Button>
				<Drawer
					opened={modalOpen}
					onClose={close}
					title={view.labels.filters}
					position="bottom"
					size="auto"
				>
					<FilterStack view={view} controls={controls} />
				</Drawer>
			</>
		);
	}

	if (isInline) {
		return (
			<>
				{controls}
				<ClearFiltersButton view={view} />
			</>
		);
	}

	// Controlled so the trigger toggles predictably and Escape/outside-click dismiss it (the prior
	// uncontrolled popover with `closeOnClickOutside={false}` could only be closed via the target).
	return (
		<Popover
			position="bottom-start"
			opened={modalOpen}
			onChange={(o) => (o ? open() : close())}
			trapFocus
			withinPortal
		>
			<Popover.Target>
				<Button
					variant="default"
					leftSection={<FilterIcon />}
					onClick={() => (modalOpen ? close() : open())}
					disabled={disabled}
					aria-haspopup="dialog"
					aria-expanded={modalOpen}
				>
					{filterButtonLabel(view.labels, activeCount)}
				</Button>
			</Popover.Target>
			<Popover.Dropdown>
				<FilterStack view={view} controls={controls} />
			</Popover.Dropdown>
		</Popover>
	);
}
