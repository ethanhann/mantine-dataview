import { createColumnHelper } from "@tanstack/react-table";
import type {
	CardRole,
	ColumnAlign,
	ColumnDataType,
	ColumnFilterMeta,
	ColumnFormatOption,
	DataColumnDef,
	FilterOption,
} from "../types/column";

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
}

export function humanize(field: string): string {
	return field
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (c) => c.toUpperCase());
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
	select: { filterVariant: "select" },
	multiselect: { filterVariant: "multiselect" },
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

		// biome-ignore lint/suspicious/noExplicitAny: TanStack accessor expects any for heterogeneous columns
		const colDef = (this.helper as any).accessor(field, {
			header: label,
			...(opts?.cell ? { cell: opts.cell } : {}),
			...(opts?.enableSorting === false ? { enableSorting: false } : {}),
			meta: {
				label,
				...(config.dataType ? { dataType: config.dataType } : {}),
				...(align ? { align } : {}),
				...(filter ? { filter } : {}),
				...(opts?.format ? { format: opts.format } : {}),
				...(opts?.card
					? {
							card: {
								role: opts.card,
								...(opts.cardOrder != null ? { order: opts.cardOrder } : {}),
							},
						}
					: {}),
			},
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
