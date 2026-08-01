"use client";

import { useTranslations } from "next-intl";
import { ExternalLink, Package } from "lucide-react";
import { ApiTokensSection } from "./ApiTokensSection";
import { DocsNote, H1, H2, PROSE } from "./docs-primitives";

/** npm package name — appears in the promo panel and the MCP client config. */
const MCP_PACKAGE = "velanto-mcp";
const MCP_NPM_URL = `https://www.npmjs.com/package/${MCP_PACKAGE}`;

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
      <h1 className={H1}>{t("apiTitle")}</h1>
      <p className={PROSE}>{t("apiIntro")}</p>

      {/* The mock's promo panel: the whole card is the link out to npm. */}
      <a
        href={MCP_NPM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-wrap items-center gap-3.5 rounded-[16px] border border-acc/[0.24] bg-[linear-gradient(135deg,#1B2430,#171A22_65%)] p-[17px_18px] text-inherit transition-colors hover:border-acc/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc"
      >
        <span
          aria-hidden
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-xl bg-acc/[0.12] text-acc"
        >
          <Package size={19} strokeWidth={1.9} />
        </span>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-bold text-foreground">
              {t("apiMcpTitle")}
            </span>
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] font-[650] text-foreground-secondary">
              {MCP_PACKAGE}
            </span>
          </div>
          <span className="text-[12.5px] leading-[1.55] text-pretty text-foreground-tertiary">
            {t("apiMcpIntro")}
          </span>
        </div>
        <span className="ms-auto flex flex-none items-center gap-[7px] text-[13px] font-[650] text-acc">
          npmjs.com
          <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
        </span>
      </a>

      {/* Mint/revoke lives right here, so you don't bounce to another page.
          The mock has no separate scope reference — every scope's description
          rides on its own checkbox inside the create form, so a reader picking
          permissions reads what each one grants at the moment it matters. */}
      <ApiTokensSection />
      <DocsNote>{t("apiScopesNarrowNote")}</DocsNote>

      <h2 className={H2}>{t("apiMcpTitle")}</h2>
      <p className={PROSE}>{t("apiMcpIntro")}</p>
      <CodeBlock>{MCP_CONFIG}</CodeBlock>
      <p className={PROSE}>{t("apiMcpToolsIntro")}</p>
      <ul className="flex flex-wrap gap-1.5">
        {MCP_TOOLS.map((tool) => (
          <li
            key={tool}
            className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] font-[650] text-foreground-tertiary"
          >
            {tool}
          </li>
        ))}
      </ul>
      <p className={PROSE}>{t("apiMcpScopeNote")}</p>

      <h2 className={H2}>{t("apiDirectTitle")}</h2>
      <p className={PROSE}>{t("apiDirectIntro")}</p>
      <CodeBlock>{CURL_EXAMPLE}</CodeBlock>
      <DocsNote>{t("apiDirectNote")}</DocsNote>
    </>
  );
}
