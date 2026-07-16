"use client";

import { useTranslations } from "next-intl";
import { Text } from "@/src/shared/components/Text";
import { Card } from "@/src/shared/components/Card";
import { PAT_SCOPES } from "@/src/shared/lib/tokens-client";
import { SCOPE_KEY } from "./scope-keys";
import { ApiTokensSection } from "./ApiTokensSection";

/**
 * A fenced code sample. Deliberately not translated — command lines, JSON keys
 * and HTTP headers are notation, and a translated one would be wrong to paste.
 */
function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[10px] border border-border bg-surface px-3.5 py-3 text-xs leading-6">
      <code>{children}</code>
    </pre>
  );
}

const MCP_CONFIG = `{
  "mcpServers": {
    "velanto": {
      "command": "npx",
      "args": ["-y", "velanto-mcp"],
      "env": {
        "VELANTO_API_TOKEN": "vlt_pat_your_token_here"
      }
    }
  }
}`;

const CURL_EXAMPLE = `curl https://api.playvelanto.com/packs/mine \\
  -H "Authorization: Bearer vlt_pat_your_token_here"`;

/** Tools the MCP server exposes, grouped by the scope that unlocks them. */
const MCP_TOOLS = [
  "get_pack",
  "list_my_packs",
  "create_pack",
  "update_pack",
  "delete_pack",
  "list_moderation_queue",
  "approve_pack",
  "reject_pack",
  "list_reports",
];

/**
 * The "API & tokens" docs topic: what a token is, what each scope grants, how to
 * wire the MCP server up to an AI assistant — with the token manager itself
 * embedded, so reading about a token and minting one happen in one place.
 */
export function ApiDocs() {
  const t = useTranslations("docs");

  return (
    <>
      <Text as="h1" variant="title" className="mb-3 text-3xl">
        {t("apiTitle")}
      </Text>
      <Text variant="secondary" className="mb-4 leading-7">
        {t("apiIntro")}
      </Text>

      <Text as="h2" className="mb-2 mt-8 text-xl font-semibold">
        {t("apiScopesTitle")}
      </Text>
      <Text variant="secondary" className="mb-4 leading-7">
        {t("apiScopesIntro")}
      </Text>
      <div className="mb-4 flex flex-col gap-2">
        {PAT_SCOPES.map((scope) => (
          <Card key={scope} className="hover:translate-y-0 hover:shadow-none">
            <code className="text-sm font-semibold text-acc">{scope}</code>
            <Text variant="secondary" className="mt-1 text-sm leading-6">
              {t(`scopeDesc_${SCOPE_KEY[scope]}`)}
            </Text>
          </Card>
        ))}
      </div>
      <Text variant="secondary" className="mb-8 leading-7">
        {t("apiScopesNarrowNote")}
      </Text>

      {/* Mint/revoke lives right here, so you don't bounce to another page. */}
      <ApiTokensSection />

      <Text as="h2" className="mb-2 mt-10 text-xl font-semibold">
        {t("apiMcpTitle")}
      </Text>
      <Text variant="secondary" className="mb-4 leading-7">
        {t("apiMcpIntro")}
      </Text>
      <CodeBlock>{MCP_CONFIG}</CodeBlock>
      <Text variant="secondary" className="mb-2 mt-4 leading-7">
        {t("apiMcpToolsIntro")}
      </Text>
      <ul className="mb-4 flex flex-wrap gap-1.5">
        {MCP_TOOLS.map((tool) => (
          <li
            key={tool}
            className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] text-secondary"
          >
            <code>{tool}</code>
          </li>
        ))}
      </ul>
      <Text variant="secondary" className="mb-4 leading-7">
        {t("apiMcpScopeNote")}
      </Text>
      <Text variant="secondary" className="mb-8 leading-7">
        {t("apiMcpFormatsNote")}
      </Text>

      <Text as="h2" className="mb-2 text-xl font-semibold">
        {t("apiDirectTitle")}
      </Text>
      <Text variant="secondary" className="mb-4 leading-7">
        {t("apiDirectIntro")}
      </Text>
      <CodeBlock>{CURL_EXAMPLE}</CodeBlock>
      <Text variant="secondary" className="mt-4 leading-7">
        {t("apiDirectNote")}
      </Text>
    </>
  );
}
