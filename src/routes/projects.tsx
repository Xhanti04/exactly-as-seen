import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined; new?: number | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined, new: s["new"] ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Projects · Workmate AI" },
      { name: "description", content: "Your projects with their tasks, meetings and research." },
      { property: "og:title", content: "Projects · Workmate AI" },
      { property: "og:description", content: "Your projects with their tasks, meetings and research." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Projects" description="Your projects with their tasks, meetings and research." />
      <Card>
        <p className="text-muted-foreground">Project management views are coming soon. Use the project switcher at the top to change projects.</p>
        <Button asChild className="mt-4"><Link to="/">Back to dashboard</Link></Button>
      </Card>
    </div>
  );
}
