import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import type { RangeFacet } from "../../types/facets";

export function FacetBuckets({
	facet,
	value,
	onChange,
}: {
	facet: RangeFacet;
	value: unknown;
	onChange: (next: unknown) => void;
}) {
	const current = Array.isArray(value) ? value : null;

	return (
		<Stack gap={4}>
			{facet.ranges.map((bucket) => {
				const isActive =
					current != null &&
					current[0] === bucket.from &&
					current[1] === bucket.to;
				return (
					<UnstyledButton
						// Labels aren't guaranteed unique; the bounds identify the bucket.
						key={`${bucket.from}-${bucket.to}`}
						aria-pressed={isActive}
						onClick={() =>
							onChange(isActive ? undefined : [bucket.from, bucket.to])
						}
						style={{
							padding: "4px 8px",
							borderRadius: "var(--mantine-radius-sm)",
							// A border (not just background color) marks the active state for color-blind
							// and high-contrast users.
							border: isActive
								? "1px solid var(--mantine-color-blue-filled)"
								: "1px solid transparent",
							background: isActive
								? "var(--mantine-color-blue-light)"
								: undefined,
						}}
					>
						<Group gap="xs" justify="space-between" wrap="nowrap">
							<Text size="sm">{bucket.label}</Text>
							<Badge
								size="sm"
								variant="light"
								color={bucket.count === 0 ? "gray" : "blue"}
							>
								{bucket.count}
							</Badge>
						</Group>
					</UnstyledButton>
				);
			})}
		</Stack>
	);
}
