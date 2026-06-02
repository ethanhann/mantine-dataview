import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RangeFacet } from "../../types/facets";
import { FacetBuckets } from "./FacetBuckets";

const facet: RangeFacet = {
	type: "ranges",
	ranges: [
		{ label: "Low", from: 0, to: 50, count: 5 },
		{ label: "Mid", from: 50, to: 100, count: 8 },
		{ label: "High", from: 100, to: 200, count: 0 },
	],
};

const renderBuckets = (value: unknown, onChange = vi.fn()) =>
	render(
		<MantineProvider>
			<FacetBuckets facet={facet} value={value} onChange={onChange} />
		</MantineProvider>,
	);

describe("FacetBuckets", () => {
	it("renders all buckets with labels and counts", () => {
		renderBuckets(null);
		expect(screen.getByText("Low")).toBeVisible();
		expect(screen.getByText("Mid")).toBeVisible();
		expect(screen.getByText("High")).toBeVisible();
		expect(screen.getByText("5")).toBeVisible();
		expect(screen.getByText("8")).toBeVisible();
		expect(screen.getByText("0")).toBeVisible();
	});

	it("calls onChange with [from, to] when clicking a bucket", async () => {
		const onChange = vi.fn();
		renderBuckets(null, onChange);
		await userEvent.click(screen.getByText("Low"));
		expect(onChange).toHaveBeenCalledWith([0, 50]);
	});

	it("calls onChange with undefined when clicking the active bucket", async () => {
		const onChange = vi.fn();
		renderBuckets([0, 50], onChange);
		await userEvent.click(screen.getByText("Low"));
		expect(onChange).toHaveBeenCalledWith(undefined);
	});

	it("allows clicking zero-count buckets to switch selection", async () => {
		const onChange = vi.fn();
		renderBuckets([0, 50], onChange);
		await userEvent.click(screen.getByText("High"));
		expect(onChange).toHaveBeenCalledWith([100, 200]);
	});

	it("does not show clear link when no value is active", () => {
		renderBuckets(null);
		expect(screen.queryByText("clear")).toBeNull();
	});
});
