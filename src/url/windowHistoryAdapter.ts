// Default URL state adapter built on the History API. It has no dependencies.

import type { UrlStateAdapter } from "./types";

export function windowHistoryAdapter(): UrlStateAdapter {
	return {
		read() {
			return Object.fromEntries(
				new URLSearchParams(window.location.search).entries(),
			);
		},
		write(next, opts) {
			const qs = new URLSearchParams(next).toString();
			// Only append "?" when there are params, so an empty managed state doesn't leave a bare
			// trailing "?" (which would also read as a spurious diff against the clean URL).
			const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
			if (opts?.replace) {
				window.history.replaceState(null, "", url);
			} else {
				window.history.pushState(null, "", url);
			}
		},
		subscribe(onChange) {
			window.addEventListener("popstate", onChange);
			return () => window.removeEventListener("popstate", onChange);
		},
	};
}
