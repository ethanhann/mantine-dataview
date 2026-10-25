import { describe, expect, it } from "vitest";
import type { PersistedState, PersistOptions } from "../../types/persist";
import type { DataViewState } from "../../types/state";
import {
	extractPersisted,
	hydrateFromStorage,
	sanitizePersisted,
} from "./persist";

const base = {
	pagination: { pageIndex: 0, pageSize: 10 },
	columnPinning: { start: [], end: [] },
} as unknown as DataViewState;

function persistOptions(stored: unknown): PersistOptions {
	return {
		adapter: {
			read: () => stored as PersistedState,
			write: () => {},
		},
	};
}

describe("persisted column pinning", () => {
	it("maps the stored left and right keys to start and end", () => {
		// Arrange
		const options = persistOptions({
			columnPinning: { left: ["name"], right: ["email"] },
		});

		// Act
		const patch = hydrateFromStorage(options, base);

		// Assert
		expect(patch.columnPinning).toEqual({ start: ["name"], end: ["email"] });
	});

	it("restores the start and end keys unchanged", () => {
		// Arrange
		const options = persistOptions({
			columnPinning: { start: ["name"], end: ["email"] },
		});

		// Act
		const patch = hydrateFromStorage(options, base);

		// Assert
		expect(patch.columnPinning).toEqual({ start: ["name"], end: ["email"] });
	});

	it("fills a missing side with an empty list", () => {
		// Arrange
		const options = persistOptions({ columnPinning: { left: ["name"] } });

		// Act
		const patch = hydrateFromStorage(options, base);

		// Assert
		expect(patch.columnPinning).toEqual({ start: ["name"], end: [] });
	});

	it("prefers start and end when both naming schemes are stored", () => {
		// Arrange
		const options = persistOptions({
			columnPinning: { left: ["old"], start: ["new"] },
		});

		// Act
		const patch = hydrateFromStorage(options, base);

		// Assert
		expect(patch.columnPinning).toEqual({ start: ["new"], end: [] });
	});

	it("falls back to the legacy key when the start side is malformed", () => {
		// Arrange
		const raw = {
			columnPinning: { start: "bad", left: ["name"] },
		} as unknown as PersistedState;

		// Act
		const result = sanitizePersisted(raw);

		// Assert
		expect(result.columnPinning).toEqual({ start: ["name"], end: undefined });
	});

	it("drops pinning with a side that is not a list of strings", () => {
		// Arrange
		const raw = {
			columnPinning: { left: "name" },
		} as unknown as PersistedState;

		// Act
		const result = sanitizePersisted(raw);

		// Assert
		expect(result.columnPinning).toBeUndefined();
	});

	it("writes pinning with the start and end keys", () => {
		// Arrange
		const state = {
			...base,
			columnPinning: { start: ["name"], end: ["email"] },
		} as DataViewState;

		// Act
		const written = extractPersisted(state, ["columnPinning"]);

		// Assert
		expect(written).toEqual({
			columnPinning: { start: ["name"], end: ["email"] },
		});
	});
});
