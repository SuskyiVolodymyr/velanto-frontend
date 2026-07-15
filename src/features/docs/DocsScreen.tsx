"use client";

import { useState } from "react";
import { DocsSidebar, type TopicId } from "./DocsSidebar";
import { DocsArticle } from "./DocsArticle";

export function DocsScreen() {
  const [activeTopic, setActiveTopic] = useState<TopicId>("start");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-7 py-10 md:flex-row md:gap-11">
      <DocsSidebar activeTopic={activeTopic} onSelect={setActiveTopic} />
      <DocsArticle activeTopic={activeTopic} />
    </main>
  );
}
