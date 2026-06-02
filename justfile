# Run all validation checks and tests
validate:
    bun x biome check
    npx tsc --noEmit
    npx vitest run
    npx vite build
    npx storybook build

docs:
    npm run dev