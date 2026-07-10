"use client";

import { useState } from "react";
import { DocsSidebar, type TopicId } from "./DocsSidebar";
import { DocsArticle } from "./DocsArticle";

export function DocsScreen() {
  const [activeTopic, setActiveTopic] = useState<TopicId>("start");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 gap-11 px-7 py-10">
      <DocsSidebar activeTopic={activeTopic} onSelect={setActiveTopic} />
      <DocsArticle activeTopic={activeTopic} />
    </main>
  );
}
