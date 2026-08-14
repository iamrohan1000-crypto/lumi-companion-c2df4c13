import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { getThreads, newThreadId } from "@/lib/lumi-manager";

export const Route = createFileRoute("/manager/")({
  head: () => ({
    meta: [
      { title: "AI Manager Chat — Lumi" },
      {
        name: "description",
        content:
          "Chat naturally with Lumi about your tasks, water, habits and focus. Answers come from your own offline data.",
      },
      { property: "og:title", content: "AI Manager Chat — Lumi" },
      {
        property: "og:description",
        content: "Ask Lumi what to do next, what's pending and how your week is going.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagerIndex,
});

function ManagerIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    const existing = getThreads()[0];
    const id = existing?.id ?? newThreadId();
    void navigate({ to: "/manager/$threadId", params: { threadId: id }, replace: true });
  }, [navigate]);
  return null;
}
