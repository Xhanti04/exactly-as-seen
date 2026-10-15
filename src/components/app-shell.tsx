import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, NotebookPen, ListChecks, BookOpenText, FolderKanban, ShieldCheck, Search, Moon, Sun, ChevronsUpDown, Plus, RotateCcw } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { hydrate, resetDemo, setState, useStore } from "@/lib/store";
import { SavedIndicator } from "./common";
import { toast } from "sonner";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Meeting Notes", url: "/meetings", icon: NotebookPen },
  { title: "Task Planner", url: "/planner", icon: ListChecks },
  { title: "Research Assistant", url: "/research", icon: BookOpenText },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Responsible AI", url: "/responsible-ai", icon: ShieldCheck },
] as const;

function Logo() {
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">W</div>;
}

function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Logo />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">Workmate AI</p>
            <p className="truncate text-xs text-muted-foreground">Workplace assistant</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((n) => (
                <SidebarMenuItem key={n.url}>
                  <SidebarMenuButton asChild isActive={n.url === "/" ? path === "/" : path.startsWith(n.url)} tooltip={n.title}>
                    <Link to={n.url}><n.icon /><span>{n.title}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Reset demo data" onClick={() => { resetDemo(); toast.success("Demo data restored"); }}>
              <RotateCcw /><span>Reset demo data</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function ProjectSwitcher() {
  const projects = useStore((s) => s.projects);
  const cur = useStore((s) => s.currentProjectId);
  const navigate = useNavigate();
  const p = projects.find((x) => x.id === cur) ?? projects[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[180px] justify-between gap-2 sm:max-w-[240px]">
          <span className="truncate">{p?.name ?? "No project"}</span><ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Switch project</DropdownMenuLabel>
        {projects.map((x) => (
          <DropdownMenuItem key={x.id} onClick={() => setState(() => ({ currentProjectId: x.id }))}>
            <span className="truncate">{x.name}</span>{x.id === cur && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/projects", search: { new: 1 } as never })}><Plus className="h-4 w-4" />New project</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { tasks, meetings, research, projects } = useStore((s) => s);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  const go = (to: string, search?: Record<string, string>) => { setOpen(false); navigate({ to, search: search as never }); };
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-9 justify-start gap-2 px-2.5 text-muted-foreground sm:w-64">
        <Search className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Search everything…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tasks, meetings, research, projects…" />
        <CommandList>
          <CommandEmpty>Nothing matches that search.</CommandEmpty>
          <CommandGroup heading="Projects">{projects.map((p) => <CommandItem key={p.id} value={`project ${p.name} ${p.description}`} onSelect={() => { setState(() => ({ currentProjectId: p.id })); go("/projects"); }}><FolderKanban />{p.name}</CommandItem>)}</CommandGroup>
          <CommandGroup heading="Tasks">{tasks.map((t) => <CommandItem key={t.id} value={`task ${t.title} ${t.owner} ${t.id}`} onSelect={() => go("/planner")}><ListChecks />{t.title}<span className="ml-auto text-xs text-muted-foreground">{t.owner}</span></CommandItem>)}</CommandGroup>
          <CommandGroup heading="Meetings">{meetings.map((m) => <CommandItem key={m.id} value={`meeting ${m.title} ${m.notes.slice(0, 200)}`} onSelect={() => go("/meetings", { id: m.id })}><NotebookPen />{m.title}</CommandItem>)}</CommandGroup>
          <CommandGroup heading="Research">{research.map((r) => <CommandItem key={r.id} value={`research ${r.question} ${r.id}`} onSelect={() => go("/research", { id: r.id })}><BookOpenText />{r.question}</CommandItem>)}</CommandGroup>
          <CommandGroup heading="Pages">{nav.map((n) => <CommandItem key={n.url} value={`page ${n.title}`} onSelect={() => go(n.url)}><n.icon />{n.title}</CommandItem>)}</CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(localStorage.getItem("workmate-theme") === "dark"); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => { const n = !dark; setDark(n); localStorage.setItem("workmate-theme", n ? "dark" : "light"); }}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => { hydrate(); }, []);
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-5">
            <SidebarTrigger />
            <ProjectSwitcher />
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <SavedIndicator />
              <GlobalSearch />
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-1 ring-border">XQ</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Xhanti Qashani<p className="text-xs font-normal text-muted-foreground">Demo workspace · stored on this device</p></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/responsible-ai">Responsible AI guide</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { resetDemo(); toast.success("Demo data restored"); }}>Reset demo data</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
