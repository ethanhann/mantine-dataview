// Pure 2D navigation for the card grid, separate from the DOM so it is exhaustively testable. Given
// the rendered card rectangles, it answers "which card is in this direction from the active one". Left
// and Right step in reading order; Down and Up move to the visually adjacent row, landing on the card
// whose left edge is nearest the current one (which clamps into a shorter last row). The hook feeds it
// real `getBoundingClientRect` values; tests feed it synthetic ones. With no usable geometry (all rects
// share a top), every card collapses into one row and only Left and Right move, the 1D floor.

export interface CardRect {
	top: number;
	left: number;
}

export type CardDirection = "up" | "down" | "left" | "right";

/** Groups card indices into rows by rounded top, ordered top to bottom, each sorted left to right. */
function groupRows(rects: CardRect[]): number[][] {
	const byTop = new Map<number, number[]>();
	rects.forEach((rect, i) => {
		const top = Math.round(rect.top);
		const bucket = byTop.get(top);
		if (bucket) bucket.push(i);
		else byTop.set(top, [i]);
	});
	return [...byTop.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([, indices]) =>
			indices.sort((x, y) => rects[x]!.left - rects[y]!.left),
		);
}

/** The index in `row` whose left edge is closest to `targetLeft`. */
function nearestByLeft(
	row: number[],
	rects: CardRect[],
	targetLeft: number,
): number {
	let best = row[0] as number;
	let bestDist = Math.abs(rects[best]!.left - targetLeft);
	for (const i of row) {
		const dist = Math.abs(rects[i]!.left - targetLeft);
		if (dist < bestDist) {
			bestDist = dist;
			best = i;
		}
	}
	return best;
}

/**
 * The next active index for `direction` from `active`, given the card rectangles in render order.
 * Returns `active` unchanged when there is nowhere to go (an edge, an empty grid, or an out-of-range
 * index).
 */
export function nextCardIndex(
	direction: CardDirection,
	active: number,
	rects: CardRect[],
): number {
	const count = rects.length;
	if (count === 0 || active < 0 || active >= count) return active;
	if (direction === "left") return Math.max(active - 1, 0);
	if (direction === "right") return Math.min(active + 1, count - 1);

	const rows = groupRows(rects);
	const rowIndex = rows.findIndex((row) => row.includes(active));
	if (rowIndex === -1) return active;
	const targetRow = direction === "down" ? rowIndex + 1 : rowIndex - 1;
	if (targetRow < 0 || targetRow >= rows.length) return active;
	return nearestByLeft(rows[targetRow]!, rects, rects[active]!.left);
}
