import type { ColumnMeta, TableMeta } from "@tanstack/react-table";
import { describe, expectTypeOf, it } from "vitest";
import type { DataViewFeatures } from "./table";

interface User {
	id: string;
}

describe("TanStack meta augmentation", () => {
	it("adds the column label to ColumnMeta for the library features", () => {
		// Arrange / Act
		type Meta = ColumnMeta<DataViewFeatures, User, string>;

		// Assert
		expectTypeOf<Meta["label"]>().toEqualTypeOf<string | undefined>();
	});

	it("adds the view mode to TableMeta for the library features", () => {
		// Arrange / Act
		type Meta = TableMeta<DataViewFeatures, User>;

		// Assert
		expectTypeOf<Meta["viewMode"]>().not.toBeAny();
	});
});
