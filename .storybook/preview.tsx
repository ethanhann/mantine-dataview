import { DirectionProvider, MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

function ApplyDirection({ dir }: { dir: "ltr" | "rtl" }) {
	useEffect(() => {
		document.documentElement.setAttribute("dir", dir);
	}, [dir]);
	return null;
}

const preview: Preview = {
	tags: ["autodocs"],
	globalTypes: {
		colorScheme: {
			name: "Color Scheme",
			description: "Mantine color scheme",
			defaultValue: "light",
			toolbar: {
				icon: "mirror",
				items: [
					{ value: "light", title: "Light" },
					{ value: "dark", title: "Dark" },
				],
			},
		},
		direction: {
			name: "Direction",
			description: "Text direction",
			defaultValue: "ltr",
			toolbar: {
				icon: "transfer",
				items: [
					{ value: "ltr", title: "Left to right" },
					{ value: "rtl", title: "Right to left" },
				],
			},
		},
	},
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: "todo",
		},
	},
	decorators: [
		(Story, context) => {
			const scheme = (context.globals.colorScheme || "light") as
				| "light"
				| "dark";
			const dir = (context.globals.direction || "ltr") as "ltr" | "rtl";
			return (
				<DirectionProvider
					key={dir}
					initialDirection={dir}
					detectDirection={false}
				>
					<MantineProvider forceColorScheme={scheme}>
						<ApplyDirection dir={dir} />
						<Story />
					</MantineProvider>
				</DirectionProvider>
			);
		},
	],
};

export default preview;
