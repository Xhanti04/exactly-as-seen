import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/research")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined; new?: number | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined, new: s["new"] ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Research Assistant · Workmate AI" },
      { name: "description", content: "Ask questions and answer them from your own pasted sources." },
      { property: "og:title", content: "Research Assistant · Workmate AI" },
      { property: "og:description", content: "Ask questions and answer them from your own pasted sources." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Research Assistant" description="Ask questions and answer them from your own pasted sources." />
      <Card>
        <p className="text-muted-foreground">The full research workspace is coming soon. Your existing research threads are saved on this device.</p>
        <Button asChild className="mt-4"><Link to="/">Back to dashboard</Link></Button>
      </Card>
    </div>
  );
}
