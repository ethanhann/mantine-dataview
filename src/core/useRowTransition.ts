import type { Row } from "@tanstack/react-table";
import { useEffect, useRef } from "react";

export interface RowTransitionResult<TData> {
	rows: Row<TData>[];
	entering: Set<string>;
	/** Increments each time the row set or order changes. Use as a CSS animation key. */
	generation: number;
}

export function useRowTransition<TData>(
	currentRows: Row<TData>[],
	enabled: boolean,
): RowTransitionResult<TData> {
	const prevIdsRef = useRef<string[]>([]);
	const hasMountedRef = useRef(false);
	const generationRef = useRef(0);
	const warnedRef = useRef(false);

	useEffect(() => {
		if (
			enabled &&
			!warnedRef.current &&
			typeof document !== "undefined" &&
			process.env.NODE_ENV !== "production"
		) {
			const sheets = Array.from(document.styleSheets);
			const hasKeyframes = sheets.some((s) => {
				try {
					return Array.from(s.cssRules).some(
						(r) =>
							r instanceof CSSKeyframesRule && r.name === "dataview-row-enter",
					);
				} catch {
					return false;
				}
			});
			if (!hasKeyframes) {
				console.warn(
					"[@ethanhann/mantine-dataview] animateRows is enabled but the CSS keyframes are missing. " +
						'Import "@ethanhann/mantine-dataview/styles.css" in your app entry.',
				);
			}
			warnedRef.current = true;
		}
	}, [enabled]);

	const currentIds = currentRows.map((r) => r.id);
	const entering = new Set<string>();
	let generationSnapshot = generationRef.current;

	if (enabled && hasMountedRef.current) {
		const prevIds = prevIdsRef.current;
		const prevSet = new Set(prevIds);

		const orderChanged =
			currentIds.length !== prevIds.length ||
			currentIds.some((id, i) => id !== prevIds[i]);

		if (orderChanged) {
			generationSnapshot = generationRef.current + 1;

			const sameSet =
				currentIds.length === prevIds.length &&
				currentIds.every((id) => prevSet.has(id));

			if (sameSet) {
				for (const id of currentIds) {
					entering.add(id);
				}
			} else {
				for (const id of currentIds) {
					if (!prevSet.has(id)) {
						entering.add(id);
					}
				}
			}
		}
	}

	useEffect(() => {
		prevIdsRef.current = currentIds;
		hasMountedRef.current = true;
		generationRef.current = generationSnapshot;
	});

	return { rows: currentRows, entering, generation: generationSnapshot };
}
