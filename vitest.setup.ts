import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";

/**
 * How long `findBy*` / `waitFor` may wait, raised from Testing Library's
 * default 1000ms.
 *
 * Several screens sit behind TWO sequential async hops — `AuthProvider` resolves
 * the session, and only then does a role-gated query fire (ModerationPanel's
 * counts, AdminScreen's overview). One second is a comfortable budget for that
 * when the file runs alone and a tight one when 296 of them share the machine,
 * so those suites failed intermittently with "Unable to find role=tab" while the
 * component was rendering perfectly — just after the deadline.
 *
 * This is a budget, not a mask: a component that never renders still fails, at
 * `testTimeout` (see vitest.config.ts). Reproduce the original failure by
 * delaying the `authClient.refresh` mock past 1000ms.
 */
configure({ asyncUtilTimeout: 5000 });
