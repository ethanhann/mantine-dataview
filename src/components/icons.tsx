// Minimal inline SVG icons. The library ships no icon dependency to stay lean. Consumers are
// free to bring something like @tabler/icons-react for their own cells and actions.

import type { SortDirection } from "@tanstack/react-table";

/**
 * Sort indicator. It highlights the up or down chevron when active and dims both when unsorted.
 * It is decorative. The accessible sort state is conveyed by `aria-sort` on the header cell.
 */
export function SortIcon({ direction }: { direction: SortDirection | false }) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			style={{ flexShrink: 0 }}
		>
			<path
				d="M8 10l4-4 4 4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={direction === "asc" ? 1 : 0.35}
			/>
			<path
				d="M8 14l4 4 4-4"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={direction === "desc" ? 1 : 0.35}
			/>
		</svg>
	);
}

// All glyphs are decorative (`aria-hidden`), so they carry no `<title>` — a title would be dead
// weight in the a11y tree and can surface an unwanted native tooltip.
function Glyph({ d, size = 16 }: { d: string; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			style={{ flexShrink: 0 }}
		>
			<path d={d} />
		</svg>
	);
}

export function SearchIcon() {
	return <Glyph d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z" />;
}

export function FilterIcon({ size }: { size?: number } = {}) {
	return <Glyph size={size} d="M3 5h18M7 12h10M10 19h4" />;
}

/** Alert triangle for the default error state. */
export function AlertIcon({ size }: { size?: number } = {}) {
	return (
		<Glyph
			size={size}
			d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
		/>
	);
}

/** Empty inbox for the default no-results state. */
export function InboxIcon({ size }: { size?: number } = {}) {
	return (
		<Glyph
			size={size}
			d="M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM4 13h3l3 3h4l3-3h3"
		/>
	);
}

export function ChevronDownIcon() {
	return <Glyph d="M6 9l6 6 6-6" />;
}

export function ChevronUpIcon() {
	return <Glyph d="M6 15l6-6 6 6" />;
}

export function PinLeftIcon() {
	return <Glyph d="M4 4v16M9 8h8M9 12h6M9 16h8" />;
}

export function PinRightIcon() {
	return <Glyph d="M20 4v16M7 8h8M9 12h6M7 16h8" />;
}
