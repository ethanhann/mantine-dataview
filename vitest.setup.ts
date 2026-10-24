import "@testing-library/jest-dom/vitest";
import "vitest-canvas-mock";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

// jsdom does not implement matchMedia; Mantine's useMediaQuery relies on it.
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}),
});

// jsdom lacks ResizeObserver, used by some Mantine components.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;

// jsdom lacks scrollIntoView; Mantine's Combobox calls it on the active option.
if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}

// jsdom does not implement pseudo-element styles and logs a warning when axe attempts to interact with them.
const getComputedStyleBase = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element) => getComputedStyleBase(element);
