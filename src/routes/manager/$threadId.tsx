import { createFileRoute } from "@tanstack/react-router";

import { ManagerChat } from "@/components/lumi/manager-chat";

export const Route = createFileRoute("/manager/$threadId")({
  head: () => ({
    meta: [
      { title: "AI Manager Chat — Lumi" },
      {
        name: "description",
        content:
          "A saved conversation with your Lumi manager about tasks, pending work, water, habits and productivity.",
      },
      { property: "og:title", content: "AI Manager Chat — Lumi" },
      {
        property: "og:description",
        content: "Continue your conversation with Lumi about your day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <ManagerChat key={threadId} threadId={threadId} />;
}
