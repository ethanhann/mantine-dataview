// Shared keyboard navigation for the table and card bodies. It manages a roving-tabindex focus point
// over the rendered items: exactly one item is tabbable, the arrow keys move that point and focus the
// target, Space toggles the active item's selection, and Shift with an arrow extends a contiguous
// range from an anchor. Movement is pluggable through `resolveNext` so the table uses a one-dimensional
// vertical model and the card grid can supply a two-dimensional one. The hook returns props to spread
// onto the container and a factory for per-item props, and adds nothing when disabled.

import {
	type KeyboardEvent,
	type MouseEvent,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { CardRect } from "./nextCardIndex";

export type GridDirection = "up" | "down" | "left" | "right";

const KEY_TO_DIRECTION: Record<string, GridDirection> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
};

const INTERACTIVE_TAGS = new Set([
	"A",
	"BUTTON",
	"INPUT",
	"SELECT",
	"TEXTAREA",
	"LABEL",
]);
const INTERACTIVE_ROLES = new Set([
	"button",
	"link",
	"checkbox",
	"menuitem",
	"switch",
	"tab",
]);

function isInteractive(el: HTMLElement): boolean {
	if (INTERACTIVE_TAGS.has(el.tagName)) return true;
	const role = el.getAttribute("role");
	return role != null && INTERACTIVE_ROLES.has(role);
}

/**
 * Whether a click should NOT activate: it landed on an interactive control (a link, button, input, or
 * the selection checkbox) or the user is selecting text. Walks from the click target up to the item.
 */
function isActivationBlocked(event: MouseEvent<HTMLElement>): boolean {
	const selection =
		typeof window !== "undefined" ? window.getSelection?.() : null;
	if (selection && !selection.isCollapsed && selection.toString().length > 0) {
		return true;
	}
	let el: HTMLElement | null = event.target as HTMLElement;
	const container = event.currentTarget;
	while (el && el !== container) {
		if (isInteractive(el)) return true;
		el = el.parentElement;
	}
	return false;
}

/** The selection mutators the hook needs, satisfied by `view.selection`. */
export interface GridSelection {
	toggle: (id: string) => void;
	select: (ids: string[]) => void;
	deselect: (ids: string[]) => void;
}

export type ResolveNext = (
	direction: GridDirection,
	active: number,
	count: number,
	/** Lazily reads the current item rectangles. The vertical default ignores it. */
	getRects: () => CardRect[],
) => number;

export interface UseGridNavigationOptions {
	/** Master switch. When false the hook returns inert props and adds no roles or handlers. */
	enabled: boolean;
	/** Whether the selection keys (Space, Shift+Arrow) act. Navigation still works when false. */
	selectable: boolean;
	/**
	 * Whether more than one item can be selected, surfaced as `aria-multiselectable`. Default `true`.
	 * Set `false` for single-select grids so the grid does not advertise multi-select.
	 */
	multiSelectable?: boolean;
	/** Ordered ids of the items currently rendered, in display order. */
	ids: string[];
	/**
	 * Total number of rows across every page, surfaced as `aria-rowcount` on the grid. Include any
	 * header row (the table does) so it agrees with the 1-based `rowIndexBase`. Omit to leave it off.
	 */
	rowCount?: number;
	/**
	 * The 1-based `aria-rowindex` of the first rendered item, accounting for the page offset and any
	 * header rows. Item `i` reports `rowIndexBase + i`. Omit to leave `aria-rowindex` off.
	 */
	rowIndexBase?: number;
	/** Selection mutators, normally `view.selection`. */
	selection: GridSelection;
	/**
	 * Whether the item at `index` can be selected, mirroring the per-row `enableRowSelection`
	 * predicate. Space and range extension skip items it rejects. Default: every item.
	 */
	canSelectItem?: (index: number) => boolean;
	/**
	 * Maps a direction to the next index. Defaults to one-dimensional vertical movement: Down and Up
	 * step by one and clamp, Left and Right are ignored. The card grid supplies a 2D resolver.
	 */
	resolveNext?: ResolveNext;
	/**
	 * Activate the item at `index` (Enter on the focused item, or a guarded single click). Omit to
	 * leave items non-clickable. The view maps the index to its typed row.
	 */
	onActivate?: (index: number, event: SyntheticEvent) => void;
}

export interface GridItemProps {
	role: "row";
	tabIndex: number;
	"aria-selected": boolean | undefined;
	"aria-rowindex"?: number;
	ref: (el: HTMLElement | null) => void;
	onFocus: () => void;
	onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export interface GridContainerProps {
	role?: "grid";
	"aria-multiselectable"?: boolean;
	"aria-rowcount"?: number;
	onKeyDown?: (event: KeyboardEvent) => void;
}

export interface GridNavigation {
	containerProps: GridContainerProps;
	getItemProps: (
		index: number,
		selected: boolean,
		canSelect?: boolean,
	) => Partial<GridItemProps>;
	activeIndex: number;
}

const verticalResolver: ResolveNext = (direction, active, count) => {
	if (direction === "down") return Math.min(active + 1, count - 1);
	if (direction === "up") return Math.max(active - 1, 0);
	return active;
};

export function useGridNavigation({
	enabled,
	selectable,
	multiSelectable = true,
	ids,
	rowCount,
	rowIndexBase,
	selection,
	canSelectItem = () => true,
	resolveNext = verticalResolver,
	onActivate,
}: UseGridNavigationOptions): GridNavigation {
	const [activeIndex, setActiveIndex] = useState(0);
	const anchorRef = useRef(0);
	// The index range the current Shift extension has applied, so growing or shrinking it
	// only touches the delta. Selections outside the range (other pages, other items on this
	// page) are never rewritten.
	const rangeRef = useRef<[number, number] | null>(null);
	const itemRefs = useRef<(HTMLElement | null)[]>([]);
	// One stable ref callback per index, so an item is not detached and reattached on every render.
	const refCallbacks = useRef<((el: HTMLElement | null) => void)[]>([]);
	// Set while we move focus programmatically so the resulting focus event does not re-sync state
	// (which would clobber the anchor mid range extension).
	const suppressFocusSync = useRef(false);

	// Keep the roving position on the same item across id-set changes. On a page change the previously
	// active id is gone, so this falls back to the top; on an in-place reorder the id is found and the
	// tab stop follows it to its new index. Only the tab stop moves, never DOM focus.
	const activeIndexRef = useRef(activeIndex);
	activeIndexRef.current = activeIndex;
	const idsKey = ids.join("\u0000");
	const prevIdsRef = useRef(ids);
	// biome-ignore lint/correctness/useExhaustiveDependencies: remap only when the id signature changes
	useEffect(() => {
		const activeId = prevIdsRef.current[activeIndexRef.current];
		const remapped = activeId == null ? -1 : ids.indexOf(activeId);
		const target = remapped >= 0 ? remapped : 0;
		setActiveIndex(target);
		anchorRef.current = target;
		rangeRef.current = null;
		prevIdsRef.current = ids;
	}, [idsKey]);

	const focusItem = useCallback((index: number) => {
		const el = itemRefs.current[index];
		if (!el) return;
		suppressFocusSync.current = true;
		el.focus();
		// The focus event is synchronous, so by here it has been consumed.
		suppressFocusSync.current = false;
	}, []);

	const getRects = useCallback(
		(): CardRect[] =>
			itemRefs.current.map((el) => {
				if (!el) return { top: 0, left: 0 };
				const rect = el.getBoundingClientRect();
				return { top: rect.top, left: rect.left };
			}),
		[],
	);

	if (!enabled) {
		return { containerProps: {}, getItemProps: () => ({}), activeIndex };
	}

	const move = (next: number, extend: boolean) => {
		setActiveIndex(next);
		focusItem(next);
		if (extend && selectable) {
			const [lo, hi] =
				anchorRef.current <= next
					? [anchorRef.current, next]
					: [next, anchorRef.current];
			const previous = rangeRef.current;
			if (previous) {
				const leaving: string[] = [];
				for (let i = previous[0]; i <= previous[1]; i++) {
					const id = ids[i];
					if (id != null && (i < lo || i > hi)) leaving.push(id);
				}
				if (leaving.length > 0) selection.deselect(leaving);
			}
			const entering: string[] = [];
			for (let i = lo; i <= hi; i++) {
				const id = ids[i];
				if (id != null && canSelectItem(i)) entering.push(id);
			}
			if (entering.length > 0) selection.select(entering);
			rangeRef.current = [lo, hi];
		} else {
			anchorRef.current = next;
			rangeRef.current = null;
		}
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (ids.length === 0) return;
		// Only act when a row itself holds focus, not a control inside it (checkbox, link, button).
		if (!itemRefs.current.includes(event.target as HTMLElement)) return;

		if (event.key === " " || event.key === "Spacebar") {
			// Only claim Space when it toggles selection, so a row in a non-selectable grid (or a
			// row the per-row predicate rejects) can still scroll the page.
			if (selectable && canSelectItem(activeIndex)) {
				event.preventDefault();
				selection.toggle(ids[activeIndex] as string);
				anchorRef.current = activeIndex;
				rangeRef.current = null;
			}
			return;
		}
		if (event.key === "Enter") {
			if (onActivate) {
				event.preventDefault();
				onActivate(activeIndex, event);
			}
			return;
		}
		if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			move(event.key === "Home" ? 0 : ids.length - 1, event.shiftKey);
			return;
		}
		const direction = KEY_TO_DIRECTION[event.key];
		if (!direction) return;
		const next = resolveNext(direction, activeIndex, ids.length, getRects);
		// Only claim the key when it actually moves, so a non-moving arrow (e.g. Left/Right in the
		// row-navigation table) leaves the container free to scroll natively.
		if (next !== activeIndex) {
			event.preventDefault();
			move(next, event.shiftKey);
		}
	};

	const getItemRef = (index: number): ((el: HTMLElement | null) => void) => {
		const existing = refCallbacks.current[index];
		if (existing) return existing;
		const cb = (el: HTMLElement | null) => {
			itemRefs.current[index] = el;
		};
		refCallbacks.current[index] = cb;
		return cb;
	};

	const getItemProps = (
		index: number,
		selected: boolean,
		canSelect = true,
	): GridItemProps => ({
		role: "row",
		tabIndex: index === activeIndex ? 0 : -1,
		// Only rows that can actually be selected advertise a selection state.
		"aria-selected": selectable && canSelect ? selected : undefined,
		...(rowIndexBase != null ? { "aria-rowindex": rowIndexBase + index } : {}),
		ref: getItemRef(index),
		onFocus: () => {
			if (suppressFocusSync.current) return;
			setActiveIndex(index);
			anchorRef.current = index;
			rangeRef.current = null;
		},
		...(onActivate
			? {
					onClick: (event: MouseEvent<HTMLElement>) => {
						if (!isActivationBlocked(event)) onActivate(index, event);
					},
				}
			: {}),
	});

	return {
		containerProps: {
			role: "grid",
			...(selectable && multiSelectable
				? { "aria-multiselectable": true }
				: {}),
			...(rowCount != null ? { "aria-rowcount": rowCount } : {}),
			onKeyDown,
		},
		getItemProps,
		activeIndex,
	};
}
