/// <reference types="vitest/config" />
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		dts({
			include: ["src"],
			exclude: ["src/**/*.stories.tsx", "src/**/*.test.{ts,tsx}"],
			tsconfigPath: "./tsconfig.build.json",
			// unplugin-dts mirrors the `src/` tree under dist; flatten it so the
			// emitted `.d.ts` paths line up with package.json `exports`.
			beforeWriteFile(filePath, content) {
				const flattened = filePath.replace(/([\\/]dist[\\/])src[\\/]/, "$1");
				const srcDir = dirname(
					filePath.replace(/([\\/])dist[\\/]src[\\/]/, "$1src/"),
				);
				const rewritten = content.replace(
					/(from\s+['"])(\.[^'"]+)(['"])/g,
					(_, pre, rel, post) => {
						try {
							if (statSync(resolve(srcDir, rel)).isDirectory()) {
								return `${pre}${rel}/index.js${post}`;
							}
						} catch {}
						return `${pre}${rel}.js${post}`;
					},
				);
				return { filePath: flattened, content: rewritten };
			},
		}),
	],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, "src/index.ts"),
				"url/index": resolve(__dirname, "src/url/index.ts"),
				"schedule/index": resolve(__dirname, "src/schedule/index.ts"),
			},
			formats: ["es"],
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			external: [
				"react",
				"react/jsx-runtime",
				"react-dom",
				"@mantine/core",
				"@mantine/dates",
				"@mantine/dates/styles.css",
				"@mantine/hooks",
				"@mantine/schedule",
				"@mantine/schedule/styles.css",
				"@tanstack/react-table",
				"dayjs",
			],
			output: {
				preserveModules: false,
			},
		},
		sourcemap: true,
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		css: true,
		coverage: {
			provider: "v8",
			// `json-summary` powers the coverage badge in the deploy workflow.
			reporter: ["text", "json-summary"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/stories/**",
				"src/**/*.stories.tsx",
				"src/**/*.test.{ts,tsx}",
				"src/**/index.ts",
				"src/types/**",
				"src/**/types.ts",
			],
			// Gate regressions
			thresholds: {
				statements: 85,
				branches: 70,
				functions: 82,
				lines: 85,
			},
		},
	},
});
