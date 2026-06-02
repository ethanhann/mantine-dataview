// For tests only. It teaches vitest's `expect` about vitest-axe matchers. It is kept at the repo
// root rather than in `src`, so it is type checked but never emitted into the published types.

import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
	// biome-ignore lint/suspicious/noExplicitAny: mirrors vitest's own Assertion<T = any> signature
	interface Assertion<T = any> extends AxeMatchers {}
	interface AsymmetricMatchersContaining extends AxeMatchers {}
}
