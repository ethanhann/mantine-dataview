/// <reference types="vitest/config" />
import { statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		react(),
		dts({
			include: ["src"],
			// `src/stories/**` covers the story helper modules (data.tsx etc.), whose
			// d.ts would otherwise ship in the package.
			exclude: [
				"src/stories/**",
				"src/**/*.stories.tsx",
				"src/**/*.test.{ts,tsx}",
			],
			tsconfigPath: "./tsconfig.build.json",
			// unplugin-dts mirrors the `src/` tree under dist; flatten it so the
			// emitted `.d.ts` paths line up with package.json `exports`.
			beforeWriteFile(filePath, content) {
				const flattened = filePath.replace(/([\\/]dist[\\/])src[\\/]/, "$1");
				// Resolve the directory-vs-file check against the source tree, which always exists. The
				// dist tree is unreliable here: its files may not be written yet when this runs, and
				// unplugin-dts may emit under `dist/` directly rather than `dist/src/`.
				const srcDir = dirname(
					resolve(
						__dirname,
						"src",
						relative(resolve(__dirname, "dist"), flattened),
					),
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
				"testing/index": resolve(__dirname, "src/testing/index.ts"),
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
				// Every export uses hooks, so mark the chunks as client modules for React
				// Server Component bundlers (Next.js App Router imports then just work).
				banner: '"use client";',
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
