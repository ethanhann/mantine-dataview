import { type ColumnMeta, createColumnHelper } from "@tanstack/react-table";
import type {
	CardFieldMeta,
	CardRole,
	ColumnAlign,
	ColumnDataType,
	ColumnFilterMeta,
	ColumnFormatOption,
	DataColumnDef,
	FilterOption,
} from "../../types/column";
import type { ScheduleFieldMeta, ScheduleRole } from "../../types/schedule";

type Field<TData> = keyof TData & string;

// biome-ignore lint/suspicious/noExplicitAny: cell renderer generic varies per column
type CellFn<TData> = DataColumnDef<TData> extends { cell?: infer C } ? C : any;

export interface ColOptions<TData> {
	header?: string;
	card?: CardRole;
	cardOrder?: number;
	filter?: false | Partial<ColumnFilterMeta>;
	format?: ColumnFormatOption;
	align?: ColumnAlign;
	cell?: CellFn<TData>;
	enableSorting?: boolean;
	options?: FilterOption[];
	/** Column width in pixels. Sets TanStack's `size` property. */
	width?: number;
	/**
	 * Role this column plays in the schedule presentation. A bare `ScheduleRole` is shorthand for
	 * `{ role }`; pass the object form to add a `map` transform (e.g. status → color).
	 */
	schedule?: ScheduleRole | ScheduleFieldMeta;
}

export function humanize(field: string): string {
	return (
		field
			.replace(/_/g, " ")
			// camelCase / digit→capital boundary: "createdAt" → "created At", "v2Name" → "v2 Name"
			.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
			// acronym run before a capitalized word: "HTTPStatus" → "HTTP Status"
			.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
			// letter→digit boundary: "address1" → "address 1"
			.replace(/([a-zA-Z])(\d)/g, "$1 $2")
			.replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

interface PresetConfig {
	dataType?: ColumnDataType;
	filterVariant?: ColumnFilterMeta["variant"];
	align?: ColumnAlign;
}

const PRESETS: Record<string, PresetConfig> = {
	text: { dataType: "text", filterVariant: "text" },
	number: { dataType: "number", filterVariant: "numberRange", align: "right" },
	currency: {
		dataType: "currency",
		filterVariant: "numberRange",
		align: "right",
	},
	date: { dataType: "date", filterVariant: "dateRange" },
	boolean: { dataType: "boolean", filterVariant: "boolean" },
	// `dataType: "text"` so a `format` override and the CSV `formatted` export apply (formatting is
	// gated on `dataType`); the default text formatter is a no-op on raw values.
	select: { dataType: "text", filterVariant: "select" },
	multiselect: { dataType: "text", filterVariant: "multiselect" },
};

export class ColumnBuilder<TData> {
	private cols: DataColumnDef<TData>[] = [];
	private helper = createColumnHelper<TData>();

	private add(
		preset: string,
		field: Field<TData>,
		opts?: ColOptions<TData>,
	): this {
		const config = PRESETS[preset];
		if (!config) throw new Error(`Unknown preset: ${preset}`);

		const label = opts?.header ?? humanize(field);
		const align = opts?.align ?? config.align;

		let filter: ColumnFilterMeta | undefined;
		if (opts?.filter === false) {
			filter = undefined;
		} else {
			const base = {
				variant: config.filterVariant,
				...(opts?.options ? { options: opts.options } : {}),
			} as ColumnFilterMeta;
			filter = opts?.filter
				? ({ ...base, ...opts.filter } as ColumnFilterMeta)
				: base;
		}

		// Build the augmented column meta as a typed value first, so a typo in a key (e.g. `dataTpye`)
		// is a compile error rather than silently dropped.
		const card: CardFieldMeta | undefined =
			opts?.card != null || opts?.cardOrder != null
				? {
						...(opts.card != null ? { role: opts.card } : {}),
						...(opts.cardOrder != null ? { order: opts.cardOrder } : {}),
					}
				: undefined;
		const schedule: ScheduleFieldMeta | undefined =
			opts?.schedule == null
				? undefined
				: typeof opts.schedule === "string"
					? { role: opts.schedule }
					: opts.schedule;
		const meta: ColumnMeta<TData, unknown> = {
			label,
			...(config.dataType ? { dataType: config.dataType } : {}),
			...(align ? { align } : {}),
			...(filter ? { filter } : {}),
			...(opts?.format ? { format: opts.format } : {}),
			...(card ? { card } : {}),
			...(schedule ? { schedule } : {}),
		};

		// biome-ignore lint/suspicious/noExplicitAny: TanStack accessor expects any for heterogeneous columns
		const colDef = (this.helper as any).accessor(field, {
			header: label,
			...(opts?.cell ? { cell: opts.cell } : {}),
			...(opts?.enableSorting === false ? { enableSorting: false } : {}),
			...(opts?.width != null ? { size: opts.width } : {}),
			meta,
		});

		this.cols.push(colDef);
		return this;
	}

	text(field: Field<TData>, opts?: ColOptions<TData>): this {
		return this.add("text", field, opts);
	}

	number(field: Field<TData>, opts?: ColOptions<TData>): this {
		return this.add("number", field, opts);
	}

	currency(field: Field<TData>, opts?: ColOptions<TData>): this {
		return this.add("currency", field, opts);
	}

	date(field: Field<TData>, opts?: ColOptions<TData>): this {
		return this.add("date", field, opts);
	}

	boolean(field: Field<TData>, opts?: ColOptions<TData>): this {
		return this.add("boolean", field, opts);
	}

	select(
		field: Field<TData>,
		opts: ColOptions<TData> & { options: FilterOption[] },
	): this {
		return this.add("select", field, opts);
	}

	multiselect(
		field: Field<TData>,
		opts: ColOptions<TData> & { options: FilterOption[] },
	): this {
		return this.add("multiselect", field, opts);
	}

	custom(colDef: DataColumnDef<TData>): this {
		this.cols.push(colDef);
		return this;
	}

	build(): DataColumnDef<TData>[] {
		return this.cols;
	}
}

export function col<TData>(): ColumnBuilder<TData> {
	return new ColumnBuilder<TData>();
}
