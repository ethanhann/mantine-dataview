// Optional convenience wrapper around `useDataView`. It owns the fetch lifecycle by calling the
// consumer's `fetcher` on each request and feeding `rows`, `rowCount`, and `status` back in. The
// simple case then needs no extra wiring. The core itself stays agnostic about how data is
// fetched and ships no query or caching dependency. This is just the controlled pattern, ready
// to use.
//
// It is named `useDataViewFetcher` because it calls hooks internally. That means the name must
// begin with `use`.

import { useDidUpdate } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	UseDataViewOptions,
	UseDataViewReturn,
} from "../../types/options";
import type { DataViewRequest, DataViewResponse } from "../../types/request";
import type { Status } from "../../types/state";
import { useDataView } from "./useDataView";

const DEFAULT_REVALIDATE_DELAY_MS = 1000;

export interface UseDataViewFetcherOptions<TData>
	extends Omit<
		UseDataViewOptions<TData>,
		"rows" | "rowCount" | "status" | "error" | "onRequestChange"
	> {
	/**
	 * Maps a request to a response, using any transport or data layer. The context's `signal`
	 * aborts when the request is superseded (a newer request, an optimistic mutation, or unmount);
	 * pass it to `fetch` to cancel the wire request. Ignoring it is safe — stale responses are
	 * discarded either way.
	 */
	fetcher: (
		request: DataViewRequest,
		context: { signal: AbortSignal },
	) => Promise<DataViewResponse<NoInfer<TData>>>;
	/** External dependencies that should trigger a refetch when they change. */
	deps?: unknown[];
	/**
	 * Delay in milliseconds before the background revalidation fetch fires after an optimistic
	 * mutation. Multiple rapid mutations coalesce into one fetch. Default `1000`.
	 */
	revalidateDelay?: number;
	/**
	 * When true, a refetch keeps the previous rows on screen (`status` stays `"success"`) instead
	 * of swapping to the loading skeletons, and `isFetching` signals the fetch in flight. The first
	 * fetch (nothing to keep) and errors behave as usual. Default `false`.
	 */
	keepPreviousData?: boolean;
	/**
	 * Server-rendered (or otherwise pre-fetched) data to seed the view with. It must answer the
	 * initial request: the mount fetch is skipped entirely, so there is no first-load skeleton and
	 * no duplicate of the fetch the server already performed. Every later change fetches normally.
	 */
	initialData?: DataViewResponse<NoInfer<TData>>;
}

export function useDataViewFetcher<TData>({
	fetcher,
	deps,
	revalidateDelay = DEFAULT_REVALIDATE_DELAY_MS,
	keepPreviousData = false,
	initialData,
	...options
}: UseDataViewFetcherOptions<TData>): UseDataViewReturn<TData> {
	const [response, setResponse] = useState<DataViewResponse<TData>>(
		() => initialData ?? { rows: [], rowCount: 0 },
	);
	const [status, setStatus] = useState<Status>(
		initialData ? "success" : "idle",
	);
	const [error, setError] = useState<unknown>(undefined);
	const [isRevalidating, setIsRevalidating] = useState(false);
	const [isFetching, setIsFetching] = useState(false);

	const fetcherRef = useRef(fetcher);
	fetcherRef.current = fetcher;
	// An id that only ever increases. It keeps a slow earlier request from overwriting a newer one.
	const requestIdRef = useRef(0);
	// Aborts the in-flight fetch when a newer one supersedes it (or on unmount), so ignored-anyway
	// responses stop consuming the wire.
	const abortRef = useRef<AbortController | null>(null);
	// Whether a successful response has landed, i.e. there is something to keep on screen.
	const hasDataRef = useRef(initialData != null);
	// Seeded data answers the initial request, so the mount emission must not fetch again.
	const skipMountFetchRef = useRef(initialData != null);
	const keepPreviousDataRef = useRef(keepPreviousData);
	keepPreviousDataRef.current = keepPreviousData;

	const lastRequestRef = useRef<DataViewRequest | null>(null);
	const revalidateTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const nextAbortSignal = useCallback(() => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		return controller.signal;
	}, []);

	const onRequestChange = useCallback(
		async (request: DataViewRequest) => {
			lastRequestRef.current = request;
			if (skipMountFetchRef.current) {
				skipMountFetchRef.current = false;
				return;
			}
			const signal = nextAbortSignal();
			const id = ++requestIdRef.current;
			setIsFetching(true);
			// With `keepPreviousData` the previous rows stay rendered during the refetch; the first
			// fetch has nothing to keep, so it still shows the loading state.
			if (!(keepPreviousDataRef.current && hasDataRef.current)) {
				setStatus("loading");
			}
			try {
				const data = await fetcherRef.current(request, { signal });
				if (id === requestIdRef.current) {
					hasDataRef.current = true;
					setResponse(data);
					setError(undefined);
					setStatus("success");
					setIsFetching(false);
					setIsRevalidating(false);
				}
			} catch (err) {
				// An abort means this request was superseded; the newer one owns the state.
				if (id === requestIdRef.current && !signal.aborted) {
					setError(err);
					setStatus("error");
					setIsFetching(false);
					setIsRevalidating(false);
				}
			}
		},
		[nextAbortSignal],
	);

	const depsKey = deps ? JSON.stringify(deps) : "";
	useDidUpdate(() => {
		if (lastRequestRef.current) {
			onRequestChange(lastRequestRef.current);
		}
	}, [depsKey]);

	const getRowIdRef = useRef(options.getRowId);
	getRowIdRef.current = options.getRowId;

	// The selection mutators live on the hook result below; the mutation callbacks are created
	// first, so they reach the current selection through a ref.
	const selectionRef = useRef<UseDataViewReturn<TData>["selection"] | null>(
		null,
	);

	// Invalidate any in-flight primary fetch so its (stale) response cannot
	// overwrite an optimistic mutation that the user just applied. The abort
	// stops the wire request too; the response would be discarded anyway.
	const invalidateInFlight = useCallback(() => {
		requestIdRef.current++;
		abortRef.current?.abort();
	}, []);

	const scheduleRevalidate = useCallback(() => {
		clearTimeout(revalidateTimerRef.current);
		setIsRevalidating(true);
		revalidateTimerRef.current = setTimeout(async () => {
			if (lastRequestRef.current) {
				const signal = nextAbortSignal();
				const id = ++requestIdRef.current;
				setIsFetching(true);
				try {
					const data = await fetcherRef.current(lastRequestRef.current, {
						signal,
					});
					if (id === requestIdRef.current) {
						hasDataRef.current = true;
						setResponse(data);
						setError(undefined);
						// The mutation may have invalidated an in-flight fetch that would
						// have settled the status, so restore it here or the UI stays
						// stranded on the skeleton or error state over fresh data.
						setStatus("success");
						setIsFetching(false);
						setIsRevalidating(false);
					}
				} catch (err) {
					if (id === requestIdRef.current && !signal.aborted) {
						// Revalidation failure does not mean the user's write failed —
						// it means we could not re-confirm it. Keep the optimistic data
						// (stale-while-revalidate) rather than setting an `error` that
						// would contradict the displayed `status: "success"`.
						if (
							typeof process !== "undefined" &&
							process.env.NODE_ENV !== "production"
						) {
							console.warn(
								"[mantine-dataview] background revalidation failed; keeping optimistic data",
								err,
							);
						}
						// The optimistic data stays on screen, so the status must agree
						// even when the mutation invalidated an in-flight fetch that
						// would otherwise have settled it.
						setStatus("success");
						setError(undefined);
						setIsFetching(false);
						setIsRevalidating(false);
					}
				}
			} else {
				setIsRevalidating(false);
			}
		}, revalidateDelay);
	}, [revalidateDelay, nextAbortSignal]);

	const patchRow = useCallback(
		(record: TData) => {
			invalidateInFlight();
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
		[scheduleRevalidate, invalidateInFlight],
	);

	const insertRow = useCallback(
		(record: TData) => {
			invalidateInFlight();
			setResponse((prev) => ({
				...prev,
				rows: [record, ...prev.rows],
				rowCount: prev.rowCount + 1,
			}));
			scheduleRevalidate();
		},
		[scheduleRevalidate, invalidateInFlight],
	);

	const removeRow = useCallback(
		(id: string) => {
			invalidateInFlight();
			setResponse((prev) => {
				const nextRows = prev.rows.filter(
					(row) => getRowIdRef.current(row) !== id,
				);
				if (nextRows.length === prev.rows.length) return prev;
				return { ...prev, rows: nextRows, rowCount: prev.rowCount - 1 };
			});
			// A removed row must not linger in the id-keyed selection, where a bulk
			// action would still submit it.
			selectionRef.current?.deselect(id);
			scheduleRevalidate();
		},
		[scheduleRevalidate, invalidateInFlight],
	);

	// Clean up the revalidation timer and abort any in-flight fetch on unmount.
	useEffect(() => {
		return () => {
			clearTimeout(revalidateTimerRef.current);
			abortRef.current?.abort();
		};
	}, []);

	const result = useDataView<TData>({
		...options,
		rows: response.rows,
		rowCount: response.rowCount,
		facets: response.facets,
		summary: response.summary,
		status,
		error,
		onRequestChange,
	});
	selectionRef.current = result.selection;

	return {
		...result,
		patchRow,
		insertRow,
		removeRow,
		isRevalidating,
		isFetching,
	};
}
