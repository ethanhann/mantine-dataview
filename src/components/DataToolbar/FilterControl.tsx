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
	Input, type MantineSize,
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

const BOOLEAN_TRUE_KEYS = new Set(["true", "1", "yes"]);
const BOOLEAN_FALSE_KEYS = new Set(["false", "0", "no"]);

function LabelWithClear({
	label,
	onClear,
	size = "xs",
}: {
	label: string;
	onClear: () => void;
	size?: MantineSize;
}) {
	return (
		<Group justify="space-between" wrap="nowrap">
			<Text size="sm" fw={500}>
				{label}
			</Text>
			<Anchor
				component="button"
				type="button"
				size={size}
				c="dimmed"
				onClick={onClear}
			>
				clear
			</Anchor>
		</Group>
	);
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

/** Serializes a Date to `YYYY-MM-DD` using local components so the day doesn't shift via UTC. */
function toIsoDate(v: Date | string | null | undefined): string | null {
	if (!v) return null;
	if (typeof v === "string") return v;
	return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
}

/** Parses a stored filter value into a Date, treating date-only strings as local (not UTC) midnight. */
function parseLocalDate(value: string): Date {
	if (DATE_ONLY_RE.test(value)) {
		const [y, mo, d] = value.split("-");
		return new Date(Number(y), Number(mo) - 1, Number(d));
	}
	return new Date(value);
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
	disabled,
    size = "xs"
}: {
	column: Column<TData>;
	facet?: FacetData;
	disabled?: boolean;
	size?: MantineSize;
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
			<Input.Wrapper label={label} className="meta-component-filter" size={size}>
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
					size={size}
					label={label}
					placeholder={placeholder}
					clearable
					disabled={disabled}
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
					size={size}
					placeholder={placeholder}
					disabled={disabled}
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
			// Accept the common truthy/falsy facet keys, not just the literal "true"/"false".
			const yesEntry = valueFacet?.values.find((v) =>
				BOOLEAN_TRUE_KEYS.has(v.value.toLowerCase()),
			);
			const noEntry = valueFacet?.values.find((v) =>
				BOOLEAN_FALSE_KEYS.has(v.value.toLowerCase()),
			);
			const yesLabel = yesEntry ? `Yes (${yesEntry.count})` : "Yes";
			const noLabel = noEntry ? `No (${noEntry.count})` : "No";
			return (
				<Input.Wrapper label={label} size={size}>
					<SegmentedControl
						fullWidth
						size="xs"
						disabled={disabled}
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
					<Input.Wrapper label={rangeLabel} size={size}>
						<Stack gap="xs">
							{buckets}
							<RangeSlider
								size={size}
								disabled={disabled}
								min={sliderMin}
								max={sliderMax}
								step={meta.step ?? 1}
								value={sliderValue}
								onChange={([lo, hi]) => {
									// Always store the selected range, including the full extent — a user
									// who deliberately wants [min, max] must be able to express it. "No
									// filter" is reached only via the explicit clear affordance.
									set([lo, hi]);
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
				return <Input.Wrapper label={rangeLabel} size={size}>{buckets}</Input.Wrapper>;
			}

			const update = (next: [NumOrNull, NumOrNull]) =>
				set(next[0] == null && next[1] == null ? undefined : next);
			const toNum = (v: number | string): NumOrNull =>
				v === "" || v == null ? null : Number(v);
			return (
				<Input.Wrapper label={label} size={size}>
					<Group gap={4} wrap="nowrap">
						<NumberInput
							size={size}
							aria-label={`${label} minimum`}
							placeholder="Min"
							disabled={disabled}
							value={min ?? ""}
							onChange={(v) => update([toNum(v), max])}
							w={90}
						/>
						<NumberInput
							size={size}
							aria-label={`${label} maximum`}
							placeholder="Max"
							disabled={disabled}
							value={max ?? ""}
							onChange={(v) => update([min, toNum(v)])}
							w={90}
						/>
					</Group>
				</Input.Wrapper>
			);
		}
		case "date": {
			const dateValue = value ? parseLocalDate(value as string) : null;
			return (
				<DatePickerInput
					label={label}
					size={size}
					placeholder={placeholder}
					clearable
					disabled={disabled}
					popoverProps={{ withinPortal: false }}
					value={dateValue}
					onChange={(d) => set(toIsoDate(d) ?? undefined)}
				/>
			);
		}
		case "dateRange": {
			const [start, end] = asArray(value) as [string | null, string | null];
			const rangeValue: [Date | null, Date | null] = [
				start ? parseLocalDate(start) : null,
				end ? parseLocalDate(end) : null,
			];
			const dateRangeLabel =
				value != null ? (
					<LabelWithClear label={label} onClear={() => set(undefined)} />
				) : (
					label
				);
			return (
				<Input.Wrapper label={dateRangeLabel} size={size}>
					<Stack gap="xs">
						{rangeFacet && (
							<FacetBuckets facet={rangeFacet} value={value} onChange={set} />
						)}
						<DatePickerInput
							type="range"
							disabled={disabled}
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
					size={size}
					placeholder={placeholder}
					disabled={disabled}
					value={(value as string | undefined) ?? ""}
					onChange={(e) => set(e.currentTarget.value || undefined)}
				/>
			);
	}
}
