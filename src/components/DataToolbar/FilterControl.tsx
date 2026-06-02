// Filter control for one column. It renders the right Mantine input for the column's filter
// variant and reads or writes the value straight through the TanStack column. The same control
// drives state the same way for both the table and the card views. That gives one component and
// true parity.

import {
	Group,
	Input,
	MultiSelect,
	NumberInput,
	RangeSlider,
	SegmentedControl,
	Select,
	TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import type { Column } from "@tanstack/react-table";
import { resolveColumnLabel } from "../../core/cardComposition";
import { resolveFormatter } from "../../core/formatValue";

// @ts-expect-error CSS import has no type declarations
import "@mantine/dates/styles.css";

type NumOrNull = number | null;

function toIsoDate(v: Date | string | null | undefined): string | null {
	if (!v) return null;
	if (typeof v === "string") return v;
	return v.toISOString().split("T")[0] ?? null;
}

function asArray(value: unknown): [unknown, unknown] {
	return Array.isArray(value) ? [value[0], value[1]] : [null, null];
}

export function FilterControl<TData>({ column }: { column: Column<TData> }) {
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

	switch (meta.variant) {
		case "select":
			return (
				<Select
					label={label}
					placeholder={placeholder}
					clearable
					data={meta.options ?? []}
					value={(value as string | undefined) ?? null}
					onChange={(v) => set(v ?? undefined)}
				/>
			);
		case "multiselect":
			return (
				<MultiSelect
					label={label}
					placeholder={placeholder}
					data={meta.options ?? []}
					value={(value as string[] | undefined) ?? []}
					onChange={(v) => set(v.length > 0 ? v : undefined)}
				/>
			);
		case "boolean": {
			const current = value == null ? "all" : value ? "yes" : "no";
			return (
				<Input.Wrapper label={label}>
					<SegmentedControl
						fullWidth
						size="xs"
						data={[
							{ value: "all", label: "All" },
							{ value: "yes", label: "Yes" },
							{ value: "no", label: "No" },
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
			const hasBounds = meta.min != null && meta.max != null;

			if (hasBounds) {
				const sliderValue: [number, number] = [
					min ?? (meta.min as number),
					max ?? (meta.max as number),
				];
				const dataType = column.columnDef.meta?.dataType;
				const formatFn = dataType
					? resolveFormatter(dataType, column.columnDef.meta?.format, undefined)
					: (v: unknown) => String(v);
				return (
					<Input.Wrapper label={label}>
						<RangeSlider
							min={meta.min}
							max={meta.max}
							value={sliderValue}
							onChange={([lo, hi]) => {
								const isDefault = lo === meta.min && hi === meta.max;
								set(isDefault ? undefined : [lo, hi]);
							}}
							label={(v) => formatFn(v)}
							minRange={1}
							aria-label={label}
						/>
					</Input.Wrapper>
				);
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
			return (
				<DatePickerInput
					type="range"
					label={label}
					placeholder={placeholder}
					clearable
					value={rangeValue}
					onChange={([s, e]) => {
						const sv = toIsoDate(s);
						const ev = toIsoDate(e);
						set(sv == null && ev == null ? undefined : [sv, ev]);
					}}
				/>
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
