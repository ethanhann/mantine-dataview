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
}

export function useDataViewFetcher<TData>({
	fetcher,
	deps,
	...options
}: UseDataViewFetcherOptions<TData>): UseDataViewReturn<TData> {
	const [response, setResponse] = useState<DataViewResponse<TData>>({
		rows: [],
		rowCount: 0,
	});
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<unknown>(undefined);

	const fetcherRef = useRef(fetcher);
	fetcherRef.current = fetcher;
	// An id that only ever increases. It keeps a slow earlier request from overwriting a newer one.
	const requestIdRef = useRef(0);

	const lastRequestRef = useRef<DataViewRequest | null>(null);

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
			}
		} catch (err) {
			if (id === requestIdRef.current) {
				setError(err);
				setStatus("error");
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

	return useDataView<TData>({
		...options,
		rows: response.rows,
		rowCount: response.rowCount,
		facets: response.facets,
		status,
		error,
		onRequestChange,
	});
}
