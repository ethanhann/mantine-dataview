// Renders a customization slot (a `(ctx) => ReactNode` render function) as a real component.
//
// Slots must be *rendered*, not merely *called*: invoking `slots.Row(ctx)` inline would run any
// hooks the consumer puts inside the slot as hooks of the host presentation, violating the rules of
// hooks, and the slot would be invisible to error boundaries and React DevTools. Wrapping the call
// in this component makes the slot a stable node in the tree whose hooks belong to it.

import type { ReactNode } from "react";

/**
 * Invokes `render(ctx)` from within this component's own render. Pass a `key` as usual when used in
 * a list. For zero-argument slots, pass `ctx={undefined}`.
 */
export function Slot<C>({
	render,
	ctx,
}: {
	render: (ctx: C) => ReactNode;
	ctx: C;
}): ReactNode {
	return render(ctx);
}
