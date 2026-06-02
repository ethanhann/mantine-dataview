// Filter control for one column. It renders the right Mantine input for the column's filter
// variant and reads or writes the value straight through the TanStack column. The same control
// drives state the same way for both the table and the card views. That gives one component and
// true parity.
//
// Date variants use native date inputs, so there is no @mantine/dates dependency. Their value is
// the ISO date string that the URL serializer already round trips.

import {
	Group,
	Input,
	MultiSelect,
	NumberInput,
	Select,
	TextInput,
} from "@mantine/core";
import type { Column } from "@tanstack/react-table";
import { resolveColumnLabel } from "../../core/cardComposition";

type NumOrNull = number | null;

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
		return <Custom value={value} onChange={set} column={column} />;
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
		case "boolean":
			return (
				<Select
					label={label}
					placeholder={placeholder}
					clearable
					data={[
						{ value: "true", label: "Yes" },
						{ value: "false", label: "No" },
					]}
					value={value == null ? null : String(value)}
					onChange={(v) => set(v == null ? undefined : v === "true")}
				/>
			);
		case "numberRange": {
			const [min, max] = asArray(value) as [NumOrNull, NumOrNull];
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
		case "date":
			return (
				<TextInput
					label={label}
					type="date"
					value={(value as string | undefined) ?? ""}
					onChange={(e) => set(e.currentTarget.value || undefined)}
				/>
			);
		case "dateRange": {
			const [start, end] = asArray(value) as [string | null, string | null];
			const update = (next: [string | null, string | null]) =>
				set(next[0] == null && next[1] == null ? undefined : next);
			return (
				<Input.Wrapper label={label}>
					<Group gap={4} wrap="nowrap">
						<TextInput
							aria-label={`${label} from`}
							type="date"
							value={start ?? ""}
							onChange={(e) => update([e.currentTarget.value || null, end])}
						/>
						<TextInput
							aria-label={`${label} to`}
							type="date"
							value={end ?? ""}
							onChange={(e) => update([start, e.currentTarget.value || null])}
						/>
					</Group>
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
