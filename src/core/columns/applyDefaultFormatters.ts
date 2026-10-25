import type {
	ColumnDataType,
	ColumnFormatOption,
	DataColumnDef,
} from "../../types/column";
import type { RowData } from "../../types/table";
import { resolveFormatter } from "./formatValue";

/**
 * Gives each column that declares a `dataType` but no `cell` renderer a cell that formats its value.
 * Columns with their own `cell` renderer, or with no `dataType`, are returned unchanged.
 */
export function applyDefaultFormatters<TData extends RowData>(
	columns: DataColumnDef<TData>[],
	formatDefaults:
		| Partial<Record<ColumnDataType, ColumnFormatOption>>
		| undefined,
): DataColumnDef<TData>[] {
	return columns.map((col) => {
		const dataType = col.meta?.dataType;
		if (!dataType || col.cell) return col;
		const formatter = resolveFormatter(
			dataType,
			col.meta?.format,
			formatDefaults,
		);
		return {
			...col,
			cell: (ctx: { getValue: () => unknown }) => formatter(ctx.getValue()),
		};
	});
}
