import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState, type DragEvent } from "react";
import { Sparkle, CalendarPlus, FolderInput, RotateCcw, GitBranch, Link2, Trash2, Plus, ListChecks, X } from "lucide-react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, ReferenceLine } from "recharts";
import { toast } from "sonner";
import { AIBadge, Card, Empty, GeneratingState, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTasks, deleteTask, getState, logActivity, setState, uid, updateTask, useStore, type Quadrant, type Task, type Status } from "@/lib/store";
import { generatePlan, simulate } from "@/lib/mock-ai";
import { addDays, fmtDate, isOverdue, today } from "@/lib/dates";
import { people } from "@/lib/seed";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Task Planner · Workmate AI" },
      { name: "description", content: "Turn goals into milestones, prioritised tasks and drag-and-drop time blocks." },
      { property: "og:title", content: "Task Planner · Workmate AI" },
      { property: "og:description", content: "Turn goals into milestones, prioritised tasks and drag-and-drop time blocks." },
    ],
  }),
  component: Planner,
});

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i);

function freeSlot(duration: number, fromDay = 0) {
  const blocks = getState().blocks;
  for (let d = fromDay; d < 5; d++) for (let h = 8; h + duration <= 18; h++) {
    if (d === 0 && h <= new Date().getHours() && fromDay === 0 && h < 17) { /* allow past slots only if needed */ }
    if (!blocks.some((b) => b.day === d && h < b.start + b.duration && b.start < h + duration)) return { day: d, start: h };
  }
  return null;
}
export function addToCalendar(t: Task, fromDay = 0) {
  const dur = Math.min(4, Math.max(1, Math.round(t.effort)));
  const slot = freeSlot(dur, fromDay);
  if (!slot) { toast.error("No free slot this week — move a block first."); return false; }
  setState((s) => ({ blocks: [...s.blocks.filter((b) => b.taskId !== t.id), { id: uid("b"), title: t.title, taskId: t.id, day: slot.day, start: slot.start, duration: dur }] }));
  return slot;
}
const dayLabel = (d: number) => (d === 0 ? "Today" : new Date(addDays(d) + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));

function Planner() {
  const { tasks, goals, projects, currentProjectId } = useStore((s) => s);
  const [horizon, setHorizon] = useState<"day" | "week">("week");
  const [draft, setDraft] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState(currentProjectId);
  const [filter, setFilter] = useState<"project" | "all">("project");
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.projectId === currentProjectId);

  const generate = async () => {
    setError(null); setLoading(true);
    try { const p = await simulate(() => generatePlan(goals, target, horizon)); setDraft(p); logActivity("planner", `${horizon === "day" ? "Daily" : "Weekly"} plan generated with ${p.length} tasks`, "/planner"); }
    catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };
  const save = () => {
    if (!draft) return;
    addTasks(draft.map((t) => ({ ...t, projectId: target })));
    const pn = projects.find((p) => p.id === target)?.name;
    toast.success(`${draft.length} tasks saved to ${pn}`); setDraft(null);
  };
  const calendarAll = () => {
    if (!draft) return;
    addTasks(draft.map((t) => ({ ...t, projectId: target })));
    let n = 0; draft.slice(0, 6).forEach((t) => { if (addToCalendar(t)) n++; });
    toast.success(`Saved and scheduled ${n} focus blocks`); setDraft(null);
  };
  const replan = () => {
    const missed = getState().tasks.filter((t) => t.status !== "done" && (t.status === "missed" || isOverdue(t.due)));
    if (!missed.length) { toast("Nothing missed — your plan is on track."); return; }
    missed.sort((a, b) => b.impact - a.impact).forEach((t, i) => {
      updateTask(t.id, { status: "todo", due: i < 2 ? today() : addDays(1), quadrant: i < 2 ? "do" : "schedule", rationale: `Replanned: was due ${fmtDate(t.due)}. ${i < 2 ? "Highest impact, moved to today." : "Moved to tomorrow to protect today's capacity."}` });
      addToCalendar(t, i < 2 ? 0 : 1);
    });
    logActivity("planner", `Replanned ${missed.length} missed task(s)`, "/planner");
    toast.success(`Replanned ${missed.length} missed task(s) by impact`);
  };

  return (
    <div>
      <PageHeader title="AI Task Planner" description="Describe your goals; Workmate breaks them into milestones and tasks, ranks them by impact and urgency, and fits them into your week."
        actions={<Button variant="outline" onClick={replan}><RotateCcw className="h-4 w-4" />Replan My Day</Button>} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Your goals" icon={<Sparkle className="h-4 w-4" />}>
          <Textarea value={goals} onChange={(e) => setState(() => ({ goals: e.target.value }))} rows={5} placeholder="One goal per line, e.g. Launch the partner referral page" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tabs value={horizon} onValueChange={(v) => setHorizon(v as "day" | "week")}><TabsList><TabsTrigger value="day">Daily</TabsTrigger><TabsTrigger value="week">Weekly</TabsTrigger></TabsList></Tabs>
            <Select value={target} onValueChange={setTarget}><SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            <Button onClick={generate} disabled={loading} className="ml-auto"><Sparkle className="h-4 w-4" />Generate plan</Button>
          </div>
          {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-destructive" role="alert">{error}</p>}
          <p className="mt-3 text-xs text-muted-foreground">You have {tasks.filter((t) => t.status !== "done").length} open tasks across projects. Priorities weigh impact against effort and how soon something is due.</p>
        </Card>

        <Card title="Generated plan" icon={<GitBranch className="h-4 w-4" />} actions={draft && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={calendarAll}><CalendarPlus className="h-3.5 w-3.5" />Add to Calendar</Button><Button size="sm" onClick={save}><FolderInput className="h-3.5 w-3.5" />Save to Project</Button></div>}>
          {loading ? <GeneratingState label="Breaking goals into milestones…" /> : draft ? (<>
            <AIBadge className="mb-3" />
            <Hierarchy tasks={draft} compact onRemove={(id) => setDraft(draft.filter((t) => t.id !== id))} />
          </>) : <Empty icon={<GitBranch className="h-5 w-5" />} title="No draft plan" text="Generate a plan to preview Goal → Milestones → Tasks before saving it." />}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Your tasks</h2>
        <div className="flex gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "project" | "all")}><TabsList><TabsTrigger value="project">Current project</TabsTrigger><TabsTrigger value="all">All projects</TabsTrigger></TabsList></Tabs>
          <QuickAdd />
        </div>
      </div>
      <Tabs defaultValue="calendar" className="mt-3">
        <TabsList className="flex-wrap"><TabsTrigger value="calendar">Time blocks</TabsTrigger><TabsTrigger value="list">Hierarchy</TabsTrigger><TabsTrigger value="eisenhower">Eisenhower</TabsTrigger><TabsTrigger value="matrix">Effort / Impact</TabsTrigger></TabsList>
        <TabsContent value="calendar"><CalendarView tasks={visible} /></TabsContent>
        <TabsContent value="list"><Card>{visible.length ? <Hierarchy tasks={visible} editable /> : <Empty icon={<ListChecks className="h-5 w-5" />} title="No tasks here" text="Generate a plan or add a task." />}</Card></TabsContent>
        <TabsContent value="eisenhower"><Eisenhower tasks={visible} /></TabsContent>
        <TabsContent value="matrix"><Matrix tasks={visible} /></TabsContent>
      </Tabs>
    </div>
  );
}

function QuickAdd() {
  const [v, setV] = useState("");
  const cur = useStore((s) => s.currentProjectId);
  const add = () => { if (!v.trim()) return; addTasks([{ id: uid("t"), title: v.trim(), projectId: cur, priority: "medium", due: addDays(2), owner: people[0] ?? "Unassigned", effort: 1, impact: 3, status: "todo", quadrant: "schedule", dependsOn: [], origin: "manual" }]); setV(""); toast.success("Task added"); };
  return <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-1"><Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Quick add task" className="h-9 w-40 sm:w-56" /><Button size="icon" variant="outline" type="submit" aria-label="Add task"><Plus className="h-4 w-4" /></Button></form>;
}

function Hierarchy({ tasks, compact, editable, onRemove }: { tasks: Task[]; compact?: boolean; editable?: boolean; onRemove?: (id: string) => void }) {
  const all = useStore((s) => s.tasks);
  const byId = (id: string) => tasks.find((t) => t.id === id) ?? all.find((t) => t.id === id);
  const groups = useMemo(() => {
    const g = new Map<string, Map<string, Task[]>>();
    tasks.forEach((t) => { const goal = t.goal ?? "Ungrouped"; const ms = t.milestone ?? "General"; if (!g.has(goal)) g.set(goal, new Map()); const m = g.get(goal)!; m.set(ms, [...(m.get(ms) ?? []), t]); });
    return g;
  }, [tasks]);
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([goal, ms]) => (
        <div key={goal}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goal · {goal}</p>
          <div className="space-y-3 border-l pl-4">
            {[...ms.entries()].map(([m, ts]) => (
              <div key={m}>
                <p className="mb-1.5 font-medium">{m} <span className="text-xs font-normal text-muted-foreground">· {ts.filter((t) => t.status === "done").length}/{ts.length} done</span></p>
                <ul className="space-y-1.5">{ts.map((t) => {
                  const blockers = t.dependsOn.map(byId).filter((d) => d && d.status !== "done") as Task[];
                  return (
                    <li key={t.id} className="rounded-lg border bg-card px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {editable ? <select aria-label="Status" value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as Status })} className="h-7 rounded-md border bg-card px-1.5 text-xs">{["todo", "in-progress", "done", "missed"].map((s) => <option key={s}>{s}</option>)}</select> : null}
                        <span className={`min-w-0 flex-1 ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                        <Pill tone={t.priority}>{t.priority}</Pill>
                        {!compact && <span className="text-xs text-muted-foreground">{t.owner.split(" ")[0]} · {t.effort}h · {fmtDate(t.due)}</span>}
                        {compact && <span className="text-xs text-muted-foreground">{t.effort}h · {fmtDate(t.due)}</span>}
                        {editable && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Add to calendar" onClick={() => { const s = addToCalendar(t); if (s) toast.success(`Scheduled ${dayLabel(s.day)} at ${s.start}:00`); }}><CalendarPlus className="h-3.5 w-3.5" /></Button>}
                        {editable && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete task" onClick={() => deleteTask(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        {onRemove && <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove from draft" onClick={() => onRemove(t.id)}><X className="h-3.5 w-3.5" /></Button>}
                      </div>
                      {(t.rationale || blockers.length > 0 || t.sourceRef) && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {blockers.length > 0 && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />Blocked by “{blockers[0]?.title}” — finish that first</span>}
                        {t.sourceRef && <Link to={t.origin === "research" ? "/research" : "/meetings"} className="flex items-center gap-1 underline-offset-2 hover:underline"><Link2 className="h-3 w-3" />From {t.origin}: {t.sourceRef.slice(0, 50)}</Link>}
                        {t.rationale && <span>{t.rationale}</span>}
                      </div>}
                    </li>);
                })}</ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const QUADS: { id: Quadrant; title: string; sub: string }[] = [
  { id: "do", title: "Do now", sub: "Urgent & important" }, { id: "schedule", title: "Schedule", sub: "Important, not urgent" },
  { id: "delegate", title: "Delegate", sub: "Urgent, less important" }, { id: "drop", title: "Drop / later", sub: "Neither" },
];
function Eisenhower({ tasks }: { tasks: Task[] }) {
  const [over, setOver] = useState<Quadrant | null>(null);
  const drop = (e: DragEvent, q: Quadrant) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("task"); if (id) updateTask(id, { quadrant: q, priority: q === "do" ? "high" : q === "drop" ? "low" : "medium" }); };
  return (
    <div>
      <p className="mb-3 text-muted-foreground">Drag tasks between quadrants. Moving a task updates its priority.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADS.map((q) => (
          <div key={q.id} onDragOver={(e) => { e.preventDefault(); setOver(q.id); }} onDragLeave={() => setOver(null)} onDrop={(e) => drop(e, q.id)} className={`surface min-h-40 p-4 transition-colors ${over === q.id ? "bg-accent" : ""}`}>
            <p className="font-semibold">{q.title}</p><p className="mb-3 text-xs text-muted-foreground">{q.sub}</p>
            <div className="space-y-1.5">{tasks.filter((t) => t.quadrant === q.id && t.status !== "done").map((t) => (
              <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("task", t.id)} className="flex cursor-grab items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 active:cursor-grabbing">
                <span className="flex-1 truncate">{t.title}</span>
                <select aria-label="Move to quadrant" value={t.quadrant} onChange={(e) => updateTask(t.id, { quadrant: e.target.value as Quadrant })} className="h-6 rounded border bg-card text-[11px] sm:hidden">{QUADS.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select>
              </div>))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Matrix({ tasks }: { tasks: Task[] }) {
  const data = tasks.filter((t) => t.status !== "done").map((t) => ({ x: t.effort, y: t.impact, z: 80, name: t.title }));
  return (
    <Card>
      <p className="mb-3 text-muted-foreground">Top-left are quick wins: high impact, low effort. Bottom-right are candidates to cut.</p>
      <div className="h-80"><ResponsiveContainer><ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid stroke="var(--color-border)" />
        <XAxis type="number" dataKey="x" name="Effort (h)" domain={[0, 6]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} label={{ value: "Effort (hours)", position: "bottom", fontSize: 11, fill: "var(--color-muted-foreground)" }} />
        <YAxis type="number" dataKey="y" name="Impact" domain={[0, 5]} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
        <ZAxis dataKey="z" range={[80, 80]} />
        <ReferenceLine x={3} stroke="var(--color-border)" strokeDasharray="4 4" /><ReferenceLine y={2.5} stroke="var(--color-border)" strokeDasharray="4 4" />
        <Tooltip cursor={false} content={({ payload }) => payload?.[0] ? <div className="surface px-3 py-2 text-xs"><p className="font-medium">{payload[0].payload.name}</p><p className="text-muted-foreground">{payload[0].payload.x}h effort · impact {payload[0].payload.y}/5</p></div> : null} />
        <Scatter data={data} fill="var(--color-chart-2)" />
      </ScatterChart></ResponsiveContainer></div>
    </Card>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const blocks = useStore((s) => s.blocks);
  const unscheduled = tasks.filter((t) => t.status !== "done" && !blocks.some((b) => b.taskId === t.id));
  const [over, setOver] = useState<string | null>(null);
  const onDrop = (e: DragEvent, day: number, start: number) => {
    e.preventDefault(); setOver(null);
    const bid = e.dataTransfer.getData("block"); const tid = e.dataTransfer.getData("task");
    if (bid) setState((s) => ({ blocks: s.blocks.map((b) => (b.id === bid ? { ...b, day, start: Math.min(start, 18 - b.duration) } : b)) }));
    else if (tid) { const t = getState().tasks.find((x) => x.id === tid); if (t) { const dur = Math.min(4, Math.max(1, Math.round(t.effort))); setState((s) => ({ blocks: [...s.blocks, { id: uid("b"), title: t.title, taskId: t.id, day, start: Math.min(start, 18 - dur), duration: dur }] })); } }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="surface h-fit p-3">
        <p className="mb-2 text-sm font-semibold">Unscheduled</p>
        <p className="mb-3 text-xs text-muted-foreground">Drag onto the calendar, or tap the button to auto-fit.</p>
        <div className="space-y-1.5">{unscheduled.length ? unscheduled.map((t) => (
          <div key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("task", t.id)} className="flex cursor-grab items-center gap-1 rounded-lg border bg-background px-2 py-1.5 text-xs">
            <span className="flex-1 truncate">{t.title}</span>
            <button aria-label="Add to calendar" onClick={() => { const s = addToCalendar(t); if (s) toast.success(`Scheduled ${dayLabel(s.day)} at ${s.start}:00`); }} className="text-muted-foreground hover:text-foreground"><CalendarPlus className="h-3.5 w-3.5" /></button>
          </div>)) : <p className="text-xs text-muted-foreground">Everything is scheduled.</p>}</div>
      </div>
      <div className="surface overflow-x-auto p-3">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: "48px repeat(5, 1fr)" }}>
          <div />
          {[0, 1, 2, 3, 4].map((d) => <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">{dayLabel(d)}</div>)}
          {HOURS.map((h) => (<Fragment key={h}>
            <div key={`h${h}`} className="pr-2 text-right text-[11px] text-muted-foreground" style={{ height: 44 }}>{h}:00</div>
            {[0, 1, 2, 3, 4].map((d) => {
              const k = `${d}-${h}`; const here = blocks.filter((b) => b.day === d && b.start === h);
              return (
                <div key={k} onDragOver={(e) => { e.preventDefault(); setOver(k); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, d, h)} className={`relative border-l border-t ${over === k ? "bg-accent" : ""}`} style={{ height: 44 }}>
                  {here.map((b) => (
                    <div key={b.id} draggable onDragStart={(e) => e.dataTransfer.setData("block", b.id)} className="group absolute inset-x-1 top-0.5 z-10 cursor-grab overflow-hidden rounded-md border bg-highlight px-1.5 py-1 text-[11px] leading-tight text-highlight-foreground" style={{ height: b.duration * 44 - 4 }}>
                      <p className="line-clamp-2 font-medium">{b.title}</p><p className="opacity-70">{b.start}:00–{b.start + b.duration}:00</p>
                      <button aria-label="Remove block" onClick={() => setState((s) => ({ blocks: s.blocks.filter((x) => x.id !== b.id) }))} className="absolute right-1 top-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                    </div>))}
                </div>);
            })}
          </Fragment>))}
        </div>
      </div>
    </div>
  );
}
