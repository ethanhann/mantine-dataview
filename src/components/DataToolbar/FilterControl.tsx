// Filter control for one column. It renders the right Mantine input for the column's filter
// variant and reads or writes the value straight through the TanStack column. The same control
// drives state the same way for both the table and the card views. That gives one component and
// true parity.
//
// When facet data is provided, controls adapt: options show counts, zero-count items are dimmed,
// and range facets render clickable bucket chips above the slider/picker.

import {
	Anchor,
	Group,
	Input,
	MultiSelect,
	NumberInput,
	RangeSlider,
	SegmentedControl,
	Select,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { Column } from "@tanstack/react-table";
import { resolveColumnLabel } from "../../core/cardComposition";
import { resolveFormatter } from "../../core/formatValue";
import type { FacetData, ValueFacet } from "../../types/facets";
import { FacetBuckets } from "./FacetBuckets";

// @ts-expect-error CSS import has no type declarations
import "@mantine/dates/styles.css";

type NumOrNull = number | null;

function LabelWithClear({
	label,
	onClear,
}: {
	label: string;
	onClear: () => void;
}) {
	return (
		<Group justify="space-between" wrap="nowrap">
			<Text size="sm" fw={500}>
				{label}
			</Text>
			<Anchor
				component="button"
				type="button"
				size="xs"
				c="dimmed"
				onClick={onClear}
			>
				clear
			</Anchor>
		</Group>
	);
}

function toIsoDate(v: Date | string | null | undefined): string | null {
	if (!v) return null;
	if (typeof v === "string") return v;
	return v.toISOString().split("T")[0] ?? null;
}

function asArray(value: unknown): [unknown, unknown] {
	return Array.isArray(value) ? [value[0], value[1]] : [null, null];
}

function facetSelectData(
	facet: ValueFacet,
	fallbackOptions?: { value: string; label: string }[],
) {
	if (facet.values.length > 0) {
		return facet.values.map((v) => ({
			value: v.value,
			label: `${v.label ?? v.value} (${v.count})`,
			disabled: v.count === 0,
		}));
	}
	return fallbackOptions ?? [];
}

export function FilterControl<TData>({
	column,
	facet,
}: {
	column: Column<TData>;
	facet?: FacetData;
}) {
	const meta = column.columnDef.meta?.filter;
	if (!meta) return null;

	const label = resolveColumnLabel(column);
	const placeholder = meta.placeholder ?? label;
	const value = column.getFilterValue();
	const set = (next: unknown) => column.setFilterValue(next);

	if (meta.component) {
		const Custom = meta.component;
		return (
			<Input.Wrapper label={label}>
				<Custom value={value} onChange={set} column={column} />
			</Input.Wrapper>
		);
	}

	const valueFacet = facet?.type === "values" ? facet : undefined;
	const rangeFacet = facet?.type === "ranges" ? facet : undefined;

	switch (meta.variant) {
		case "select":
			return (
				<Select
					label={label}
					placeholder={placeholder}
					clearable
					data={
						valueFacet
							? facetSelectData(valueFacet, meta.options)
							: (meta.options ?? [])
					}
					value={(value as string | undefined) ?? null}
					onChange={(v) => set(v ?? undefined)}
				/>
			);
		case "multiselect":
			return (
				<MultiSelect
					label={label}
					placeholder={placeholder}
					data={
						valueFacet
							? facetSelectData(valueFacet, meta.options)
							: (meta.options ?? [])
					}
					value={(value as string[] | undefined) ?? []}
					onChange={(v) => set(v.length > 0 ? v : undefined)}
				/>
			);
		case "boolean": {
			const current = value == null ? "all" : value ? "yes" : "no";
			const yesEntry = valueFacet?.values.find((v) => v.value === "true");
			const noEntry = valueFacet?.values.find((v) => v.value === "false");
			const yesLabel = yesEntry ? `Yes (${yesEntry.count})` : "Yes";
			const noLabel = noEntry ? `No (${noEntry.count})` : "No";
			return (
				<Input.Wrapper label={label}>
					<SegmentedControl
						fullWidth
						size="xs"
						data={[
							{ value: "all", label: "All" },
							{ value: "yes", label: yesLabel },
							{ value: "no", label: noLabel },
						]}
						value={current}
						onChange={(v) => {
							if (v === "all") set(undefined);
							else set(v === "yes");
						}}
					/>
				</Input.Wrapper>
			);
		}
		case "numberRange": {
			const [min, max] = asArray(value) as [NumOrNull, NumOrNull];
			const sliderMin = meta.min ?? (rangeFacet?.min as number | undefined);
			const sliderMax = meta.max ?? (rangeFacet?.max as number | undefined);
			const hasBounds = sliderMin != null && sliderMax != null;
			const hasValue = value != null;

			const buckets = rangeFacet ? (
				<FacetBuckets facet={rangeFacet} value={value} onChange={set} />
			) : null;

			const rangeLabel = hasValue ? (
				<LabelWithClear label={label} onClear={() => set(undefined)} />
			) : (
				label
			);

			if (hasBounds) {
				const sliderValue: [number, number] = [
					min ?? (sliderMin as number),
					max ?? (sliderMax as number),
				];
				const dataType = column.columnDef.meta?.dataType;
				const formatFn = dataType
					? resolveFormatter(dataType, column.columnDef.meta?.format, undefined)
					: (v: unknown) => String(v);
				return (
					<Input.Wrapper label={rangeLabel}>
						<Stack gap="xs">
							{buckets}
							<RangeSlider
								min={sliderMin}
								max={sliderMax}
								step={meta.step ?? 1}
								value={sliderValue}
								onChange={([lo, hi]) => {
									const isDefault = lo === sliderMin && hi === sliderMax;
									set(isDefault ? undefined : [lo, hi]);
								}}
								label={(v) => formatFn(v)}
								minRange={meta.step ?? 1}
								aria-label={label}
							/>
						</Stack>
					</Input.Wrapper>
				);
			}

			if (buckets) {
				return <Input.Wrapper label={rangeLabel}>{buckets}</Input.Wrapper>;
			}

			const update = (next: [NumOrNull, NumOrNull]) =>
				set(next[0] == null && next[1] == null ? undefined : next);
			const toNum = (v: number | string): NumOrNull =>
				v === "" || v == null ? null : Number(v);
			return (
				<Input.Wrapper label={label}>
					<Group gap={4} wrap="nowrap">
						<NumberInput
							aria-label={`${label} minimum`}
							placeholder="Min"
							value={min ?? ""}
							onChange={(v) => update([toNum(v), max])}
							w={90}
						/>
						<NumberInput
							aria-label={`${label} maximum`}
							placeholder="Max"
							value={max ?? ""}
							onChange={(v) => update([min, toNum(v)])}
							w={90}
						/>
					</Group>
				</Input.Wrapper>
			);
		}
		case "date": {
			const dateValue = value ? new Date(value as string) : null;
			return (
				<DatePickerInput
					label={label}
					placeholder={placeholder}
					clearable
					popoverProps={{ withinPortal: false }}
					value={dateValue}
					onChange={(d) => set(toIsoDate(d) ?? undefined)}
				/>
			);
		}
		case "dateRange": {
			const [start, end] = asArray(value) as [string | null, string | null];
			const rangeValue: [Date | null, Date | null] = [
				start ? new Date(start) : null,
				end ? new Date(end) : null,
			];
			const dateRangeLabel =
				value != null ? (
					<LabelWithClear label={label} onClear={() => set(undefined)} />
				) : (
					label
				);
			return (
				<Input.Wrapper label={dateRangeLabel}>
					<Stack gap="xs">
						{rangeFacet && (
							<FacetBuckets facet={rangeFacet} value={value} onChange={set} />
						)}
						<DatePickerInput
							type="range"
							popoverProps={{ withinPortal: false }}
							placeholder={placeholder}
							clearable
							value={rangeValue}
							onChange={([s, e]) => {
								const sv = toIsoDate(s);
								const ev = toIsoDate(e);
								set(sv == null && ev == null ? undefined : [sv, ev]);
							}}
						/>
					</Stack>
				</Input.Wrapper>
			);
		}
		default:
			// text
			return (
				<TextInput
					label={label}
					placeholder={placeholder}
					value={(value as string | undefined) ?? ""}
					onChange={(e) => set(e.currentTarget.value || undefined)}
				/>
			);
	}
}
