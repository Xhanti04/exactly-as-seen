import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, CalendarClock, BookOpenText, Zap, History, NotebookPen, ListChecks, FolderKanban, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Card, Empty, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { updateTask, useStore } from "@/lib/store";
import { fmtDate, isOverdue, relTime, today } from "@/lib/dates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Workmate AI" },
      { name: "description", content: "Your focus for today, upcoming meetings, research threads and recent AI activity." },
      { property: "og:title", content: "Dashboard · Workmate AI" },
      { property: "og:description", content: "Your focus for today, upcoming meetings, research threads and recent AI activity." },
    ],
  }),
  component: Dashboard,
});

const icons = { meeting: NotebookPen, planner: ListChecks, research: BookOpenText, project: FolderKanban };

function Dashboard() {
  const { tasks, meetings, research, activity, projects, currentProjectId } = useStore((s) => s);
  const project = projects.find((p) => p.id === currentProjectId);
  const focus = tasks.filter((t) => t.status !== "done" && (t.due <= today() || t.priority === "high")).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const projTasks = tasks.filter((t) => t.projectId === currentProjectId);
  const pct = projTasks.length ? Math.round((projTasks.filter((t) => t.status === "done").length / projTasks.length) * 100) : 0;
  const upcoming = [...meetings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const hour = new Date().getHours();

  return (
    <div>
      <PageHeader title={`Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, Xhanti`} description={project ? `Working in ${project.name} — ${pct}% of its tasks complete.` : "Pick a project to get started."} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Today's Focus" icon={<Target className="h-4 w-4" />} className="lg:col-span-2" actions={<Button asChild variant="ghost" size="sm"><Link to="/planner">Open planner <ArrowRight className="h-3.5 w-3.5" /></Link></Button>}>
          {project && <div className="mb-4"><div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>{project.name}</span><span>{pct}%</span></div><Progress value={pct} className="h-1.5" /></div>}
          {focus.length ? (
            <ul className="divide-y">
              {focus.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <button aria-label="Toggle done" onClick={() => updateTask(t.id, { status: t.status === "done" ? "todo" : "done" })} className="text-muted-foreground hover:text-foreground">
                    {t.status === "done" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.owner} · {t.effort}h</p></div>
                  <Pill tone={t.priority}>{t.priority}</Pill>
                  <span className={`w-14 text-right text-xs ${isOverdue(t.due) ? "text-destructive" : "text-muted-foreground"}`}>{isOverdue(t.due) ? "Overdue" : fmtDate(t.due)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty icon={<Target className="h-5 w-5" />} title="Nothing urgent today" text="Generate a plan from your goals to fill your day with the right work." action={<Button asChild size="sm"><Link to="/planner">Plan my day</Link></Button>} />}
        </Card>

        <Card title="Quick Actions" icon={<Zap className="h-4 w-4" />} delay={0.05}>
          <div className="grid gap-2">
            {[
              { to: "/meetings", label: "Summarise a meeting", sub: "Paste notes, get decisions & actions", icon: NotebookPen },
              { to: "/planner", label: "Plan my day", sub: "Turn goals into time blocks", icon: ListChecks },
              { to: "/research", label: "Ask a research question", sub: "Answer from your own sources", icon: BookOpenText },
              { to: "/projects", label: "Review projects", sub: "Tasks, notes and research together", icon: FolderKanban },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent">
                <a.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1"><p className="font-medium">{a.label}</p><p className="text-xs text-muted-foreground">{a.sub}</p></div>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Upcoming & Recent Meetings" icon={<CalendarClock className="h-4 w-4" />} delay={0.1}>
          {upcoming.length ? <ul className="space-y-3">{upcoming.map((m) => (
            <li key={m.id}><Link to="/meetings" search={{ id: m.id } as never} className="block rounded-lg p-2 -m-2 hover:bg-accent">
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(m.date)} · {m.result ? `${m.result.actions.length} action items` : "Not summarised yet"}</p>
            </Link></li>))}</ul>
            : <Empty icon={<CalendarClock className="h-5 w-5" />} title="No meetings yet" text="Add your first meeting notes." action={<Button asChild size="sm"><Link to="/meetings">Add notes</Link></Button>} />}
        </Card>

        <Card title="Active Research Threads" icon={<BookOpenText className="h-4 w-4" />} delay={0.15}>
          {research.length ? <ul className="space-y-3">{research.slice(0, 4).map((r) => (
            <li key={r.id}><Link to="/research" search={{ id: r.id } as never} className="block rounded-lg p-2 -m-2 hover:bg-accent">
              <p className="line-clamp-2 font-medium">{r.question}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">{r.sources.length} sources · {r.result ? `${r.result.findings.length} findings` : "Not run yet"}{r.sourceFirst && <Pill>Source-first</Pill>}</p>
            </Link></li>))}</ul>
            : <Empty icon={<BookOpenText className="h-5 w-5" />} title="No research threads" text="Start one with a question and a few pasted sources." action={<Button asChild size="sm"><Link to="/research">Start research</Link></Button>} />}
        </Card>

        <Card title="Recent AI Activity" icon={<History className="h-4 w-4" />} delay={0.2}>
          {activity.length ? <ul className="space-y-3">{activity.slice(0, 6).map((a) => { const I = icons[a.kind]; return (
            <li key={a.id}><Link to={a.href} className="flex gap-3 rounded-lg p-1 -m-1 hover:bg-accent"><I className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="leading-snug">{a.text}</p><p className="text-xs text-muted-foreground">{relTime(a.at)}</p></div></Link></li>); })}</ul>
            : <Empty icon={<History className="h-5 w-5" />} title="No AI activity yet" text="Generated summaries, plans and research will show up here." />}
        </Card>
      </div>
    </div>
  );
}
