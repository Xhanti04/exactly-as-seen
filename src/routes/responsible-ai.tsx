import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card } from "@/components/common";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/responsible-ai")({
  validateSearch: (s: Record<string, unknown>): { id?: string | undefined; new?: number | undefined } => ({ id: typeof s["id"] === "string" ? s["id"] : undefined, new: s["new"] ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: "Responsible AI · Workmate AI" },
      { name: "description", content: "How to use AI-generated output safely at work." },
      { property: "og:title", content: "Responsible AI · Workmate AI" },
      { property: "og:description", content: "How to use AI-generated output safely at work." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div>
      <PageHeader title="Responsible AI" description="How to use AI-generated output safely at work." />
      <Card>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground"><li><b className="text-foreground">Hallucinations:</b> AI can produce confident but wrong statements. Every output here is simulated and marked “AI-generated · Verify before use”.</li><li><b className="text-foreground">Source verification:</b> check claims against the original text. URLs are never fetched.</li><li><b className="text-foreground">Confidence limits:</b> confidence labels are rough signals, not proof.</li><li><b className="text-foreground">Privacy:</b> all data stays in your browser on this device.</li><li><b className="text-foreground">Human review:</b> a person should approve decisions, tasks and emails before they are shared.</li></ul>
        <Button asChild className="mt-4"><Link to="/">Back to dashboard</Link></Button>
      </Card>
    </div>
  );
}
