import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Declaring an `openGraph` object in a route stops Next inheriting the
  // file-based app/opengraph-image.tsx, so the card has to be described
  // explicitly or the page previews blank on Facebook, LinkedIn, Discord,
  // Slack, iMessage and Telegram — while still looking correct on Twitter,
  // which is why it went unnoticed twice (#233, #235). buildOpenGraph() exists
  // so no route has to remember; this makes forgetting it a lint error rather
  // than a silent regression a human has to catch in review.
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Property[key.name='openGraph'] > ObjectExpression, Property[key.value='openGraph'] > ObjectExpression",
          message:
            "Build openGraph metadata with buildOpenGraph() from @/src/shared/lib/open-graph. An inline object silently disinherits app/opengraph-image.tsx and the page previews with no image (velanto-frontend#235).",
        },
      ],
    },
  },
  // Turn off ESLint rules that conflict with Prettier formatting. Must stay
  // LAST so it overrides the formatting-related rules from the configs above.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
