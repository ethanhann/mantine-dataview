// Filter surface. Up to `inlineThreshold` filterable columns render inline on desktop. Beyond
// that they collapse into a popover. On mobile, filters open in a bottom drawer.

import {
	Button,
	Drawer,
	Group,
	Popover,
	Stack,
	useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { belowBreakpointQuery } from "../../core/useForceCards";
import type { UseDataViewReturn } from "../../types/options";
import { CloseIcon, FilterIcon } from "../icons";
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
			variant="subtle"
			size="compact-sm"
			color="gray"
			leftSection={<CloseIcon />}
			onClick={() => view.table.resetColumnFilters()}
		>
			Reset filters
		</Button>
	);
}

function filterButtonLabel(activeCount: number): string {
	return activeCount > 0 ? `Filters (${activeCount})` : "Filters";
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

export function FilterControls<TData>({
	view,
	inlineThreshold,
}: {
	view: UseDataViewReturn<TData>;
	inlineThreshold: number;
}) {
	const columns = view.filterableColumns;
	const theme = useMantineTheme();
	const isMobile = useMediaQuery(
		belowBreakpointQuery(theme.breakpoints.sm),
		false,
	);
	const [modalOpen, { open, close }] = useDisclosure(false);

	if (columns.length === 0) return null;

	const controls = columns.map((column) => (
		<FilterControl key={column.id} column={column} />
	));
	const activeCount = view.state.columnFilters.length;

	if (isMobile) {
		return (
			<>
				<Button variant="default" leftSection={<FilterIcon />} onClick={open}>
					{filterButtonLabel(activeCount)}
				</Button>
				<Drawer
					opened={modalOpen}
					onClose={close}
					title="Filters"
					position="bottom"
					size="auto"
				>
					<FilterStack view={view} controls={controls} />
				</Drawer>
			</>
		);
	}

	if (columns.length <= inlineThreshold) {
		return (
			<>
				{controls}
				<ClearFiltersButton view={view} />
			</>
		);
	}

	return (
		<Popover position="bottom-start" trapFocus>
			<Popover.Target>
				<Button variant="default" leftSection={<FilterIcon />}>
					{filterButtonLabel(activeCount)}
				</Button>
			</Popover.Target>
			<Popover.Dropdown>
				<FilterStack view={view} controls={controls} />
			</Popover.Dropdown>
		</Popover>
	);
}
