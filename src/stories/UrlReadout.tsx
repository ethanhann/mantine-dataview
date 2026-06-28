// Shared story helper. Storybook runs the preview in an iframe, so its URL never reaches the
// browser address bar — this polls and displays the iframe's query string so URL-sync stories can
// show state round-tripping to the URL.

import { Text } from "@mantine/core";
import { useEffect, useState } from "react";

export function UrlReadout() {
	const [search, setSearch] = useState(window.location.search);
	useEffect(() => {
		const id = setInterval(() => setSearch(window.location.search), 300);
		return () => clearInterval(id);
	}, []);
	return (
		<Text size="xs" ff="monospace" c="dimmed">
			URL: {search || "(no query params)"}
		</Text>
	);
}
