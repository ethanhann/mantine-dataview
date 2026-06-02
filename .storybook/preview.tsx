import { MantineProvider } from "@mantine/core";
import type { Preview } from "@storybook/react";
import "@mantine/core/styles.css";

const preview: Preview = {
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
			return (
				<MantineProvider forceColorScheme={scheme}>
					<Story />
				</MantineProvider>
			);
		},
	],
};

export default preview;
