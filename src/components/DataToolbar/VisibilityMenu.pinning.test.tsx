import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { VisibilityMenu } from "./VisibilityMenu";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
] satisfies DataColumnDef<User>[];

function Harness() {
	const view = useDataView<User>({
		columns,
		rows: [{ id: "1", name: "Ada" }],
		rowCount: 1,
		status: "success",
		getRowId: (u) => u.id,
	});
	return (
		<>
			<VisibilityMenu view={view} />
			<span data-testid="pinning">
				{JSON.stringify(view.state.columnPinning)}
			</span>
		</>
	);
}

async function openMenu() {
	render(
		<MantineProvider>
			<Harness />
		</MantineProvider>,
	);
	await userEvent.click(screen.getByRole("button", { name: "Columns" }));
}

async function findPinButtons(): Promise<[HTMLElement, HTMLElement]> {
	const buttons = await screen.findAllByRole("button", {
		hidden: true,
		name: /^Pin Name to /,
	});
	return [buttons[0] as HTMLElement, buttons[1] as HTMLElement];
}

describe("VisibilityMenu column pinning", () => {
	it("pins a column to the start", async () => {
		// Arrange
		await openMenu();

		// Act
		await userEvent.click(
			await screen.findByRole("button", { name: "Pin Name to start" }),
		);

		// Assert
		expect(screen.getByTestId("pinning")).toHaveTextContent(
			'{"start":["name"],"end":[]}',
		);
	});

	it("pins a column to the end", async () => {
		// Arrange
		await openMenu();

		// Act
		await userEvent.click(
			await screen.findByRole("button", { name: "Pin Name to end" }),
		);

		// Assert
		expect(screen.getByTestId("pinning")).toHaveTextContent(
			'{"start":[],"end":["name"]}',
		);
	});

	it("unpins a column when its active pin button is pressed again", async () => {
		// Arrange
		await openMenu();
		const pinStart = await screen.findByRole("button", {
			name: "Pin Name to start",
		});
		await userEvent.click(pinStart);

		// Act
		await userEvent.click(pinStart);

		// Assert
		expect(screen.getByTestId("pinning")).toHaveTextContent(
			'{"start":[],"end":[]}',
		);
	});
});

describe("VisibilityMenu pin button pressed state", () => {
	it("marks both pin buttons as not pressed for an unpinned column", async () => {
		// Arrange / Act
		await openMenu();

		// Assert
		const [pinStart, pinEnd] = await findPinButtons();
		expect(pinStart).toHaveAttribute("aria-pressed", "false");
		expect(pinEnd).toHaveAttribute("aria-pressed", "false");
	});

	it("marks only the start button as pressed after it is clicked", async () => {
		// Arrange
		await openMenu();
		const [pinStart, pinEnd] = await findPinButtons();

		// Act
		await userEvent.click(pinStart);

		// Assert
		expect(pinStart).toHaveAttribute("aria-pressed", "true");
		expect(pinEnd).toHaveAttribute("aria-pressed", "false");
	});

	it("moves the pressed state to the end button when the pin changes sides", async () => {
		// Arrange
		await openMenu();
		const [pinStart, pinEnd] = await findPinButtons();
		await userEvent.click(pinStart);

		// Act
		await userEvent.click(pinEnd);

		// Assert
		expect(pinStart).toHaveAttribute("aria-pressed", "false");
		expect(pinEnd).toHaveAttribute("aria-pressed", "true");
	});

	it("exposes the pinned button through the pressed role query", async () => {
		// Arrange
		await openMenu();
		const [, pinEnd] = await findPinButtons();
		await userEvent.click(pinEnd);

		// Act
		const pressed = await screen.findByRole("button", {
			hidden: true,
			pressed: true,
		});

		// Assert
		expect(pressed).toHaveAccessibleName("Pin Name to end");
	});
});
