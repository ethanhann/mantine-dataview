// Optional convenience wrapper around `useDataView`. It owns the fetch lifecycle by calling the
// consumer's `fetcher` on each request and feeding `rows`, `rowCount`, and `status` back in. The
// simple case then needs no extra wiring. The core itself stays agnostic about how data is
// fetched and ships no query or caching dependency. This is just the controlled pattern, ready
// to use.
//
// It is named `useDataViewFetcher` because it calls hooks internally. That means the name must
// begin with `use`.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseDataViewOptions, UseDataViewReturn } from "../types/options";
import type { DataViewRequest, DataViewResponse } from "../types/request";
import type { Status } from "../types/state";
import { useDataView } from "./useDataView";

const DEFAULT_REVALIDATE_DELAY_MS = 1000;

export interface UseDataViewFetcherOptions<TData>
	extends Omit<
		UseDataViewOptions<TData>,
		"rows" | "rowCount" | "status" | "error" | "onRequestChange"
	> {
	/** Maps a request to a response, using any transport or data layer. */
	fetcher: (
		request: DataViewRequest,
	) => Promise<DataViewResponse<NoInfer<TData>>>;
	/** External dependencies that should trigger a refetch when they change. */
	deps?: unknown[];
	/**
	 * Delay in milliseconds before the background revalidation fetch fires after an optimistic
	 * mutation. Multiple rapid mutations coalesce into one fetch. Default `1000`.
	 */
	revalidateDelay?: number;
}

export function useDataViewFetcher<TData>({
	fetcher,
	deps,
	revalidateDelay = DEFAULT_REVALIDATE_DELAY_MS,
	...options
}: UseDataViewFetcherOptions<TData>): UseDataViewReturn<TData> {
	const [response, setResponse] = useState<DataViewResponse<TData>>({
		rows: [],
		rowCount: 0,
	});
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<unknown>(undefined);
	const [isRevalidating, setIsRevalidating] = useState(false);

	const fetcherRef = useRef(fetcher);
	fetcherRef.current = fetcher;
	// An id that only ever increases. It keeps a slow earlier request from overwriting a newer one.
	const requestIdRef = useRef(0);

	const lastRequestRef = useRef<DataViewRequest | null>(null);
	const revalidateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const onRequestChange = useCallback(async (request: DataViewRequest) => {
		lastRequestRef.current = request;
		const id = ++requestIdRef.current;
		setStatus("loading");
		try {
			const data = await fetcherRef.current(request);
			if (id === requestIdRef.current) {
				setResponse(data);
				setError(undefined);
				setStatus("success");
				setIsRevalidating(false);
			}
		} catch (err) {
			if (id === requestIdRef.current) {
				setError(err);
				setStatus("error");
				setIsRevalidating(false);
			}
		}
	}, []);

	const depsKey = deps ? JSON.stringify(deps) : "";
	const prevDepsKeyRef = useRef(depsKey);
	useEffect(() => {
		if (prevDepsKeyRef.current === depsKey) return;
		prevDepsKeyRef.current = depsKey;
		if (lastRequestRef.current) {
			onRequestChange(lastRequestRef.current);
		}
	});

	const getRowIdRef = useRef(options.getRowId);
	getRowIdRef.current = options.getRowId;

	const scheduleRevalidate = useCallback(() => {
		clearTimeout(revalidateTimerRef.current);
		setIsRevalidating(true);
		revalidateTimerRef.current = setTimeout(async () => {
			if (lastRequestRef.current) {
				const id = ++requestIdRef.current;
				try {
					const data = await fetcherRef.current(lastRequestRef.current);
					if (id === requestIdRef.current) {
						setResponse(data);
						setError(undefined);
						setIsRevalidating(false);
					}
				} catch (err) {
					if (id === requestIdRef.current) {
						setError(err);
						setIsRevalidating(false);
					}
				}
			} else {
				setIsRevalidating(false);
			}
		}, revalidateDelay);
	}, [revalidateDelay]);

	const patchRow = useCallback(
		(record: TData) => {
			const id = getRowIdRef.current(record);
			setResponse((prev) => {
				const idx = prev.rows.findIndex(
					(row) => getRowIdRef.current(row) === id,
				);
				if (idx === -1) return prev;
				const nextRows = [...prev.rows];
				nextRows[idx] = record;
				return { ...prev, rows: nextRows };
			});
			scheduleRevalidate();
		},
		[scheduleRevalidate],
	);

	const insertRow = useCallback(
		(record: TData) => {
			setResponse((prev) => ({
				...prev,
				rows: [record, ...prev.rows],
				rowCount: prev.rowCount + 1,
			}));
			scheduleRevalidate();
		},
		[scheduleRevalidate],
	);

	const removeRow = useCallback(
		(id: string) => {
			setResponse((prev) => {
				const nextRows = prev.rows.filter(
					(row) => getRowIdRef.current(row) !== id,
				);
				if (nextRows.length === prev.rows.length) return prev;
				return { ...prev, rows: nextRows, rowCount: prev.rowCount - 1 };
			});
			scheduleRevalidate();
		},
		[scheduleRevalidate],
	);

	// Clean up revalidation timer on unmount.
	useEffect(() => {
		return () => clearTimeout(revalidateTimerRef.current);
	}, []);

	const result = useDataView<TData>({
		...options,
		rows: response.rows,
		rowCount: response.rowCount,
		facets: response.facets,
		status,
		error,
		onRequestChange,
	});

	return {
		...result,
		patchRow,
		insertRow,
		removeRow,
		isRevalidating,
	};
}
