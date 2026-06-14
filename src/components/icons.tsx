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
function Glyph({ d }: { d: string }) {
	return (
		<svg
			width="16"
			height="16"
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

export function FilterIcon() {
	return <Glyph d="M3 5h18M7 12h10M10 19h4" />;
}

export function ChevronDownIcon() {
	return <Glyph d="M6 9l6 6 6-6" />;
}

export function CloseIcon() {
	return <Glyph d="M18 6L6 18M6 6l12 12" />;
}

export function PinLeftIcon() {
	return <Glyph d="M4 4v16M9 8h8M9 12h6M9 16h8" />;
}

export function PinRightIcon() {
	return <Glyph d="M20 4v16M7 8h8M9 12h6M7 16h8" />;
}
