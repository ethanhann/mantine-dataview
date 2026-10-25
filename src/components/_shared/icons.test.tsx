import { DirectionProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PinEndIcon, PinStartIcon } from "./icons";

function barX(container: HTMLElement): string | null {
	const d = container.querySelector("path")?.getAttribute("d") ?? "";
	return /^M(\d+)/.exec(d)?.[1] ?? null;
}

describe("pin icons", () => {
	it("draws the start bar on the left in left to right", () => {
		// Arrange
		const { container } = render(<PinStartIcon />);

		// Assert
		expect(barX(container)).toBe("4");
	});

	it("draws the end bar on the right in left to right", () => {
		// Arrange
		const { container } = render(<PinEndIcon />);

		// Assert
		expect(barX(container)).toBe("20");
	});

	it("draws the start bar on the right in right to left", () => {
		// Arrange
		const { container } = render(
			<DirectionProvider initialDirection="rtl" detectDirection={false}>
				<PinStartIcon />
			</DirectionProvider>,
		);

		// Assert
		expect(barX(container)).toBe("20");
	});

	it("draws the end bar on the left in right to left", () => {
		// Arrange
		const { container } = render(
			<DirectionProvider initialDirection="rtl" detectDirection={false}>
				<PinEndIcon />
			</DirectionProvider>,
		);

		// Assert
		expect(barX(container)).toBe("4");
	});
});
