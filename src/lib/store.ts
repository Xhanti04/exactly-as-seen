import { useSyncExternalStore } from "react";
import { seed } from "./seed";

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in-progress" | "done" | "missed";
export type Quadrant = "do" | "schedule" | "delegate" | "drop";

export interface Project { id: string; name: string; description: string; color: number; createdAt: string }
export interface Task {
  id: string; title: string; projectId: string; priority: Priority; due: string; owner: string;
  effort: number; impact: number; status: Status; quadrant: Quadrant; dependsOn: string[];
  goal?: string; milestone?: string; sourceRef?: string; origin?: "meeting" | "research" | "planner" | "manual";
  rationale?: string;
}
export interface ActionItem { id: string; text: string; owner: string; deadline: string }
export interface MeetingResult {
  summary: string; decisions: string[]; inferred: string[]; actions: ActionItem[];
  related: { id: string; title: string; date: string; overlap: string[] }[];
  speakers: { name: string; words: number; sentiment: number }[];
  email: string; generatedAt: string;
}
export interface Meeting { id: string; title: string; date: string; projectId: string; notes: string; result?: MeetingResult }
export interface Source { id: string; label: string; kind: "text" | "url"; content: string }
export interface Finding { text: string; cites: { sourceId: string; passage: string }[]; confidence: "High" | "Medium" | "Low" }
export interface ResearchResult {
  mode: "source-first" | "unverified" | "mixed";
  findings: Finding[]; insights: string[]; recommendations: string[]; counterpoints: string[];
  unfetchedUrls: string[]; generatedAt: string;
}
export interface Research { id: string; question: string; projectId: string; sources: Source[]; sourceFirst: boolean; devils: boolean; result?: ResearchResult; updatedAt: string }
export interface Block { id: string; title: string; taskId?: string; day: number; start: number; duration: number }
export interface Activity { id: string; kind: "meeting" | "planner" | "research" | "project"; text: string; at: string; href: string }

export interface State {
  projects: Project[]; tasks: Task[]; meetings: Meeting[]; research: Research[];
  blocks: Block[]; activity: Activity[]; currentProjectId: string; goals: string;
}

const KEY = "workmate-ai-v1";
let state: State = seed();
let hydrated = false;
const listeners = new Set<() => void>();
const savedListeners = new Set<(t: number) => void>();

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch { /* corrupted storage: keep seed */ }
  listeners.forEach((l) => l());
}

export function setState(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  listeners.forEach((l) => l());
  const t = Date.now();
  savedListeners.forEach((l) => l(t));
}

export function resetDemo() { setState(() => seed()); }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => sel(state),
    () => sel(state),
  );
}
export const getState = () => state;
export function onSaved(fn: (t: number) => void) { savedListeners.add(fn); return () => { savedListeners.delete(fn); }; }

export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function logActivity(kind: Activity["kind"], text: string, href: string) {
  setState((s) => ({ activity: [{ id: uid("a"), kind, text, href, at: new Date().toISOString() }, ...s.activity].slice(0, 30) }));
}

export function addTasks(tasks: Task[]) { setState((s) => ({ tasks: [...tasks, ...s.tasks] })); }
export function updateTask(id: string, patch: Partial<Task>) {
  setState((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}
export function deleteTask(id: string) {
  setState((s) => ({ tasks: s.tasks.filter((t) => t.id !== id).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== id) })), blocks: s.blocks.filter((b) => b.taskId !== id) }));
}
