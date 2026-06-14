// Responsive forcing to cards. Below the configured Mantine breakpoint `isMobileForced` becomes
// true and the core returns a view of cards no matter what the stored choice is. That choice is
// preserved, so the explicit selection comes back once the viewport is wide enough again.

import { useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ResponsiveOptions } from "../types/options";

/** A media query that never matches, used when no responsive breakpoint is configured. */
const NEVER_MATCHES = "(max-width: 0px)";

/**
 * Builds a query meaning "strictly narrower than this breakpoint". The small epsilon keeps the
 * boundary from overlapping a minimum width query at the same breakpoint. That matches the
 * convention Mantine itself uses.
 */
export function belowBreakpointQuery(value: string): string {
	const match = /^([\d.]+)(\D*)$/.exec(value.trim());
	if (!match) return `(max-width: ${value})`;
	const amount = Number(match[1]);
	// A malformed numeric part (e.g. "1.2.3") yields NaN; fall back to the raw value rather than
	// emitting `max-width: NaN`.
	if (Number.isNaN(amount)) return `(max-width: ${value})`;
	const unit = match[2] || "px";
	const epsilon = unit === "em" || unit === "rem" ? 0.01 : 0.1;
	return `(max-width: ${amount - epsilon}${unit})`;
}

export function useForceCards(
	responsive: ResponsiveOptions | undefined,
): boolean {
	const theme = useMantineTheme();
	const breakpoint = responsive?.forceCardsBelow;
	const raw = breakpoint ? theme.breakpoints[breakpoint] : undefined;
	const query = raw ? belowBreakpointQuery(raw) : NEVER_MATCHES;
	// Initial value is `false`, so on the server and first client paint the table is assumed. On a
	// narrow viewport this means a brief table→cards flip after hydration; acceptable for an SSR-safe
	// default and avoids a hydration mismatch.
	const below = useMediaQuery(query, false);
	return Boolean(raw) && Boolean(below);
}
