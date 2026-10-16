import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, FileText, Globe, Loader2, Plus, Scale, Sparkles, Trash2 } from "lucide-react";
import { AIBadge, Card, Empty, GeneratingState, PageHeader, Pill, confTone } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore, setState, uid, logActivity, type Research, type Source } from "@/lib/store";
import { compareSources, generateResearch, isUrl, simulate } from "@/lib/mock-ai";
import { cn } from "@/lib/utils";

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

function patchResearch(id: string, patch: Partial<Research>) {
  setState((s) => ({
    research: s.research.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)),
  }));
}

function Page() {
  const research = useStore((s) => s.research);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const { id, new: isNew } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = research.find((r) => r.id === id) ?? (isNew ? undefined : research[0]);

  const createThread = () => {
    const r: Research = {
      id: uid("r"), question: "", projectId: currentProjectId, sources: [],
      sourceFirst: true, devils: false, updatedAt: new Date().toISOString(),
    };
    setState((s) => ({ research: [r, ...s.research] }));
    logActivity("research", "Research thread started", `/research?id=${r.id}`);
    void navigate({ to: "/research", search: { id: r.id } });
  };

  const run = async (r: Research) => {
    setBusy(true); setError("");
    try {
      const result = await simulate(() => generateResearch(r.question, r.sources, r.sourceFirst, r.devils));
      patchResearch(r.id, { result });
      logActivity("research", `Findings generated for "${r.question.slice(0, 40)}"`, `/research?id=${r.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Research Assistant"
        description="Paste your sources, ask a question, and get findings with citations and confidence levels."
        actions={<Button onClick={createThread} className="gap-1.5"><Plus className="h-4 w-4" /> New thread</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Thread list */}
        <Card title="Threads" className="h-fit">
          {research.length === 0 ? (
            <p className="text-sm text-muted-foreground">No research threads yet.</p>
          ) : (
            <ul className="space-y-1">
              {research.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/research"
                    search={{ id: r.id }}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                      current?.id === r.id && "bg-muted font-medium",
                    )}
                  >
                    <span className="line-clamp-2">{r.question || "Untitled question"}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {r.sources.length} source{r.sources.length === 1 ? "" : "s"}
                      {r.result ? " · analysed" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Workspace */}
        {!current ? (
          <Empty
            icon={<BookOpen className="h-5 w-5" />}
            title="Start a research thread"
            text="Ask a question, paste the documents or notes you want answers from, and Workmate will extract findings with citations."
            action={<Button onClick={createThread} className="gap-1.5"><Plus className="h-4 w-4" /> New thread</Button>}
          />
        ) : (
          <ThreadWorkspace
            key={current.id}
            r={current}
            busy={busy}
            error={error}
            onRun={() => void run(current)}
            onDelete={() => {
              setState((s) => ({ research: s.research.filter((x) => x.id !== current.id) }));
              void navigate({ to: "/research", search: {} });
            }}
          />
        )}
      </div>
    </div>
  );
}

function ThreadWorkspace({ r, busy, error, onRun, onDelete }: { r: Research; busy: boolean; error: string; onRun: () => void; onDelete: () => void }) {
  const addSource = (kind: Source["kind"]) =>
    patchResearch(r.id, {
      sources: [...r.sources, { id: uid("s"), label: kind === "url" ? "Web link" : `Source ${r.sources.length + 1}`, kind, content: "" }],
    });
  const patchSource = (sid: string, patch: Partial<Source>) =>
    patchResearch(r.id, { sources: r.sources.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  const removeSource = (sid: string) =>
    patchResearch(r.id, { sources: r.sources.filter((s) => s.id !== sid) });

  const comparison = compareSources(r.sources);

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rq" className="mb-1.5 block text-sm font-medium">Research question</Label>
            <Textarea
              id="rq"
              value={r.question}
              onChange={(e) => patchResearch(r.id, { question: e.target.value })}
              rows={2}
              placeholder="e.g. Should we add a progress checklist to onboarding?"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Sources</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addSource("text")} className="gap-1"><FileText className="h-3.5 w-3.5" /> Paste text</Button>
                <Button variant="outline" size="sm" onClick={() => addSource("url")} className="gap-1"><Globe className="h-3.5 w-3.5" /> Add link</Button>
              </div>
            </div>
            {r.sources.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                No sources yet. Paste interview notes, reports or tickets — answers will cite them. You can also run without sources for unverified general analysis.
              </p>
            ) : (
              <ul className="space-y-3">
                {r.sources.map((s) => (
                  <li key={s.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {s.kind === "url" ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Input value={s.label} onChange={(e) => patchSource(s.id, { label: e.target.value })} className="h-8 flex-1 text-sm font-medium" aria-label="Source label" />
                      <Button variant="ghost" size="sm" onClick={() => removeSource(s.id)} aria-label="Remove source" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {s.kind === "url" ? (
                      <Input
                        value={s.content}
                        onChange={(e) => patchSource(s.id, { content: e.target.value })}
                        placeholder="https://…"
                        aria-label="Source URL"
                        className={cn("text-sm", s.content && !isUrl(s.content) && "border-destructive")}
                      />
                    ) : (
                      <Textarea value={s.content} onChange={(e) => patchSource(s.id, { content: e.target.value })} rows={4} placeholder="Paste the source text here…" className="text-[13px] leading-relaxed" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={r.sourceFirst} onCheckedChange={(v) => patchResearch(r.id, { sourceFirst: v })} />
              Source-first mode
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={r.devils} onCheckedChange={(v) => patchResearch(r.id, { devils: v })} />
              Devil's advocate
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onRun} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {r.result ? "Re-analyse" : "Analyse"}
            </Button>
            <Button variant="ghost" onClick={onDelete} className="gap-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete thread</Button>
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
      </Card>

      {busy && <Card><GeneratingState label="Reading your sources and drafting findings…" /></Card>}

      {!busy && r.result && (
        <Tabs defaultValue="findings">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="insights">Insights &amp; next steps</TabsTrigger>
              <TabsTrigger value="compare" disabled={comparison.length < 2}>Compare sources</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <AIBadge />
              <Pill tone={r.result.mode === "source-first" ? "success" : r.result.mode === "mixed" ? "medium" : "high"}>
                {r.result.mode === "source-first" ? "Source-first" : r.result.mode === "mixed" ? "Mixed evidence" : "Unverified"}
              </Pill>
            </div>
          </div>

          <TabsContent value="findings" className="space-y-4">
            <Card title="Findings" delay={0.05}>
              <ul className="space-y-4">
                {r.result.findings.map((f, i) => (
                  <li key={i} className="rounded-lg border p-4">
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <p className="text-[15px] leading-relaxed">{f.text}</p>
                      <Pill tone={confTone(f.confidence)}>{f.confidence}</Pill>
                    </div>
                    {f.cites.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {f.cites.map((c, j) => {
                          const src = r.sources.find((s) => s.id === c.sourceId);
                          return (
                            <blockquote key={j} className="border-l-2 border-highlight pl-3 text-[13px] text-muted-foreground">
                              <span className="font-medium text-foreground">{src?.label ?? "Source"}:</span> “{c.passage}”
                            </blockquote>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1 text-[13px] text-muted-foreground">No source citation — treat as a general suggestion.</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            {r.result.counterpoints.length > 0 && (
              <Card title="Devil's advocate" icon={<Scale className="h-4 w-4" />} delay={0.1}>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                  {r.result.counterpoints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card title="Insights" delay={0.05}>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {r.result.insights.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>
            <Card title="Recommended next steps" delay={0.1}>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {r.result.recommendations.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
            </Card>
            {r.result.unfetchedUrls.length > 0 && (
              <Card title="Links not fetched" delay={0.15}>
                <p className="mb-2 text-sm text-muted-foreground">This demo runs fully on your device, so web links aren't fetched. Paste the page text as a source to include it.</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {r.result.unfetchedUrls.map((u, i) => <li key={i} className="break-all">{u}</li>)}
                </ul>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="compare">
            <Card title="Source comparison" delay={0.05}>
              <div className="grid gap-4 sm:grid-cols-2">
                {comparison.map((c) => (
                  <div key={c.id} className="rounded-lg border p-4">
                    <p className="mb-1 font-medium">{c.label}</p>
                    <p className="mb-3 text-xs text-muted-foreground">{c.words} words · tone: {c.tone}{c.hasNumbers ? " · includes figures" : ""}</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">{c.themes.map((t) => <Pill key={t}>{t}</Pill>)}</div>
                    <ul className="space-y-1.5 text-[13px] text-muted-foreground">
                      {c.claims.map((cl, i) => <li key={i} className="border-l-2 border-muted pl-2">“{cl}”</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
