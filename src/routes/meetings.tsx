import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NotebookPen, Plus, Sparkle, Gavel, Lightbulb, ListTodo, History, Mail, BarChart3, Trash2, Copy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AIBadge, Card, Empty, GeneratingState, PageHeader, Pill, RegenButton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addTasks, logActivity, setState, uid, useStore, type Meeting, type MeetingResult, type Task } from "@/lib/store";
import { draftEmail, generateMeeting, regenSummary, simulate } from "@/lib/mock-ai";
import { addDays, fmtDate, today } from "@/lib/dates";
import { people } from "@/lib/seed";

export const Route = createFileRoute("/meetings")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => ({
    meta: [
      { title: "Meeting Notes · Workmate AI" },
      { name: "description", content: "Turn raw meeting notes into summaries, decision logs, owned action items and follow-up emails." },
      { property: "og:title", content: "Meeting Notes · Workmate AI" },
      { property: "og:description", content: "Turn raw meeting notes into summaries, decision logs, owned action items and follow-up emails." },
    ],
  }),
  component: MeetingsPage,
});

const patchMeeting = (id: string, p: Partial<Meeting>) => setState((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
const patchResult = (m: Meeting, p: Partial<MeetingResult>) => m.result && patchMeeting(m.id, { result: { ...m.result, ...p } });

function MeetingsPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/meetings" });
  const meetings = useStore((s) => s.meetings);
  const cur = useStore((s) => s.currentProjectId);
  const m = meetings.find((x) => x.id === id) ?? meetings[0];
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const nm: Meeting = { id: uid("m"), title: "Untitled meeting", date: today(), projectId: cur, notes: "" };
    setState((s) => ({ meetings: [nm, ...s.meetings] }));
    navigate({ search: { id: nm.id } });
  };

  const run = async (section: "all" | "summary" | "decisions" | "actions" | "email") => {
    if (!m) return;
    setError(null); setLoading(section);
    try {
      const r = await simulate(() => generateMeeting(m.title, m.notes));
      if (section === "all") { patchMeeting(m.id, { result: r }); logActivity("meeting", `Summary generated for ${m.title}`, `/meetings`); }
      else if (section === "summary") patchResult(m, { summary: m.result ? regenSummary(r, m.title) : r.summary });
      else if (section === "decisions") patchResult(m, { decisions: r.decisions, inferred: r.inferred });
      else if (section === "actions") patchResult(m, { actions: r.actions });
      else patchResult(m, { email: draftEmail(m.title, m.result?.decisions ?? r.decisions, m.result?.actions ?? r.actions) });
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(null); }
  };

  const createTasks = () => {
    if (!m?.result?.actions.length) return toast.error("No action items to convert.");
    const tasks: Task[] = m.result.actions.map((a) => ({ id: uid("t"), title: a.text, projectId: m.projectId, priority: a.deadline && a.deadline <= addDays(2) ? "high" : "medium", due: a.deadline || addDays(5), owner: a.owner, effort: 2, impact: 3, status: "todo", quadrant: a.deadline && a.deadline <= addDays(2) ? "do" : "schedule", dependsOn: [], origin: "meeting", sourceRef: m.title }));
    addTasks(tasks); logActivity("meeting", `${tasks.length} tasks created from ${m.title}`, "/planner");
    toast.success(`${tasks.length} tasks added to the planner`, { action: { label: "View", onClick: () => navigate({ to: "/planner" }) } });
  };

  return (
    <div>
      <PageHeader title="Meeting Notes" description="Paste or type notes. Workmate pulls out what was decided, who owns what, and what still needs attention." actions={<Button onClick={create}><Plus className="h-4 w-4" />New meeting</Button>} />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="surface h-fit p-2">
          {meetings.length ? meetings.map((x) => (
            <button key={x.id} onClick={() => navigate({ search: { id: x.id } })} className={`w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent ${x.id === m?.id ? "bg-accent" : ""}`}>
              <p className="truncate font-medium">{x.title}</p><p className="text-xs text-muted-foreground">{fmtDate(x.date)}{x.result ? " · Summarised" : ""}</p>
            </button>
          )) : <p className="p-3 text-muted-foreground">No meetings yet.</p>}
        </aside>

        {!m ? <Empty icon={<NotebookPen className="h-5 w-5" />} title="No meeting selected" text="Create a meeting to paste your notes." action={<Button onClick={create}>New meeting</Button>} /> : (
          <div className="min-w-0 space-y-4">
            <Card>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <Input value={m.title} onChange={(e) => patchMeeting(m.id, { title: e.target.value })} className="font-medium" aria-label="Meeting title" />
                <Input type="date" value={m.date} onChange={(e) => patchMeeting(m.id, { date: e.target.value })} className="sm:w-44" aria-label="Meeting date" />
                <Button variant="ghost" size="icon" aria-label="Delete meeting" onClick={() => { setState((s) => ({ meetings: s.meetings.filter((x) => x.id !== m.id) })); navigate({ search: { id: undefined } }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea value={m.notes} onChange={(e) => patchMeeting(m.id, { notes: e.target.value })} rows={9} placeholder={"Use 'Name: what they said' per line for talk-time.\nE.g. Amara: We agreed to drop the video tour.\nLiam will share the test script by Wednesday."} className="font-mono text-[13px] leading-relaxed" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{m.notes.split(/\s+/).filter(Boolean).length} words · auto-saved on this device</p>
                <Button onClick={() => run("all")} disabled={!!loading}><Sparkle className="h-4 w-4" />{m.result ? "Regenerate all" : "Generate Summary"}</Button>
              </div>
              {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-destructive" role="alert">{error}</p>}
            </Card>

            {loading === "all" ? <Card><GeneratingState label="Reading notes, separating decisions from suggestions…" /></Card> : m.result ? <Results m={m} loading={loading} run={run} createTasks={createTasks} /> : (
              <Empty icon={<Sparkle className="h-5 w-5" />} title="No summary yet" text="Generate a summary to see decisions, action items, related past meetings and a follow-up email." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Results({ m, loading, run, createTasks }: { m: Meeting; loading: string | null; run: (s: "summary" | "decisions" | "actions" | "email") => void; createTasks: () => void }) {
  const r = m.result!;
  const [showEmail, setShowEmail] = useState(true);
  const chart = r.speakers.map((s) => ({ name: s.name, words: s.words, sentiment: Math.round(s.sentiment * 100) }));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Summary" icon={<Sparkle className="h-4 w-4" />} className="xl:col-span-2" actions={<RegenButton onClick={() => run("summary")} loading={loading === "summary"} />}>
        <AIBadge className="mb-3" />
        <Textarea value={r.summary} onChange={(e) => patchResult(m, { summary: e.target.value })} rows={3} className="resize-none border-transparent bg-transparent px-0 text-[15px] leading-relaxed shadow-none focus-visible:border-input focus-visible:px-3" />
      </Card>

      <Card title="Decision Log" icon={<Gavel className="h-4 w-4" />} actions={<RegenButton onClick={() => run("decisions")} loading={loading === "decisions"} />}>
        <AIBadge className="mb-3" />
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Stated decisions</p>
        {r.decisions.length ? <ul className="space-y-2">{r.decisions.map((d, i) => (
          <li key={i} className="flex gap-2"><Gavel className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />
            <Input value={d} onChange={(e) => patchResult(m, { decisions: r.decisions.map((x, j) => (j === i ? e.target.value : x)) })} className="h-auto border-transparent px-1 py-0.5 shadow-none focus-visible:border-input" /></li>))}</ul>
          : <p className="text-muted-foreground">No explicit decisions found (look for words like “agreed” or “decided”).</p>}
        <p className="mb-2 mt-5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" />Inferred suggestions — not decided</p>
        {r.inferred.length ? <ul className="space-y-2">{r.inferred.map((d, i) => <li key={i} className="rounded-lg border border-dashed px-3 py-2 text-muted-foreground">{d}</li>)}</ul> : <p className="text-muted-foreground">No open risks detected.</p>}
      </Card>

      <Card title="Action Items" icon={<ListTodo className="h-4 w-4" />} actions={<RegenButton onClick={() => run("actions")} loading={loading === "actions"} />}>
        <AIBadge className="mb-3" />
        {r.actions.length ? <ul className="space-y-3">{r.actions.map((a, i) => {
          const set = (p: Partial<typeof a>) => patchResult(m, { actions: r.actions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <li key={a.id} className="rounded-xl border p-3">
              <Input value={a.text} onChange={(e) => set({ text: e.target.value })} className="mb-2 h-auto border-transparent px-1 py-0.5 font-medium shadow-none focus-visible:border-input" />
              <div className="flex flex-wrap gap-2">
                <select value={a.owner} onChange={(e) => set({ owner: e.target.value })} className="h-8 rounded-md border bg-card px-2 text-xs">{["Unassigned", ...people].map((p) => <option key={p}>{p}</option>)}</select>
                <Input type="date" value={a.deadline} onChange={(e) => set({ deadline: e.target.value })} className="h-8 w-40 text-xs" />
                {!a.deadline && <Pill tone="medium">No deadline stated</Pill>}
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label="Remove" onClick={() => patchResult(m, { actions: r.actions.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>);
        })}</ul> : <p className="text-muted-foreground">No action items found.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={createTasks} disabled={!r.actions.length}><ListTodo className="h-4 w-4" />Create Tasks from Action Items</Button>
          <Button variant="outline" onClick={() => { setShowEmail(true); run("email"); }}><Mail className="h-4 w-4" />Draft Follow-up Email</Button>
        </div>
      </Card>

      <Card title="Was this discussed before?" icon={<History className="h-4 w-4" />}>
        <AIBadge className="mb-3" />
        {r.related.length ? <ul className="space-y-3">{r.related.map((p) => (
          <li key={p.id} className="rounded-xl border p-3"><div className="flex justify-between gap-2"><p className="font-medium">{p.title}</p><span className="text-xs text-muted-foreground">{fmtDate(p.date)}</span></div>
            <div className="mt-2 flex flex-wrap gap-1">{p.overlap.map((w) => <Pill key={w}>{w}</Pill>)}</div></li>))}</ul>
          : <p className="text-muted-foreground">No closely related past meetings found in your archive.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Matched by shared topic keywords against your demo meeting archive.</p>
      </Card>

      <Card title="Sentiment & talk time" icon={<BarChart3 className="h-4 w-4" />}>
        {chart.length ? (<>
          <div className="h-48"><ResponsiveContainer><BarChart data={chart} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" /><XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} /><YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v} words`, "Talk time"]} />
            <Bar dataKey="words" radius={[0, 6, 6, 0]}>{chart.map((c, i) => <Cell key={i} fill={c.sentiment > 20 ? "var(--color-chart-3)" : c.sentiment < -20 ? "var(--color-chart-4)" : "var(--color-chart-5)"} />)}</Bar>
          </BarChart></ResponsiveContainer></div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {chart.map((c) => <span key={c.name}>{c.name}: {c.sentiment > 20 ? "Positive" : c.sentiment < -20 ? "Concerned" : "Neutral"}</span>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Estimated from word choice — a rough signal, not a read on how anyone felt.</p>
        </>) : <p className="text-muted-foreground">Prefix lines with “Name:” to see talk time per person.</p>}
      </Card>

      {showEmail && <Card title="Follow-up email draft" icon={<Mail className="h-4 w-4" />} className="xl:col-span-2" actions={<div className="flex gap-1"><RegenButton onClick={() => run("email")} loading={loading === "email"} /><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(r.email); toast.success("Email copied"); }}><Copy className="h-3 w-3" />Copy</Button></div>}>
        <AIBadge className="mb-3" />
        <Textarea value={r.email} onChange={(e) => patchResult(m, { email: e.target.value })} rows={14} className="font-mono text-[13px]" />
      </Card>}
    </div>
  );
}
