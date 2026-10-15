import { pastMeetings, people } from "./seed";
import { addDays } from "./dates";
import { uid, type ActionItem, type MeetingResult, type Source, type ResearchResult, type Finding, type Task, type Priority, type Quadrant } from "./store";

export const simulate = <T,>(fn: () => T, ms = 900 + Math.random() * 700) =>
  new Promise<T>((res, rej) => setTimeout(() => { try { res(fn()); } catch (e) { rej(e); } }, ms));

const STOP = new Set("the a an and or but to of in on for with is are was were be been it this that we i you they he she our my your at by from as not have has had will would can could should do does did so if then than just very also about into there their them its im i'm a bit yet".split(" "));
export const keywords = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
const topK = (words: string[], k: number) => {
  const c = new Map<string, number>(); words.forEach((w) => c.set(w, (c.get(w) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w);
};
const sentences = (t: string) => t.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 3);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const strip = (s: string) => s.replace(/^[A-Z][a-z]+:\s*/, "").replace(/[.\s]+$/, "");

const POS = ["done", "great", "good", "agreed", "booked", "ready", "improved", "happy", "progress", "approved", "nearly", "confident"];
const NEG = ["worried", "concern", "blocked", "risk", "poorly", "not", "delay", "issue", "problem", "late", "hasn't", "can't", "missing"];
const DECISION = /\b(decided|agreed|approved|confirmed|we will go with|going with|signed off|final call)\b/i;
const ACTION = /\b(will|to\s+(?:instrument|draft|share|send|create|review|update|follow|book|prepare|finish|write)|needs? to|action:|todo|by (?:mon|tue|wed|thu|fri|sat|sun|next|eod|end|\d))/i;
const DEADLINE = /\b(?:by|before|on|due)\s+((?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)|eod|end of (?:day|week|month)|tomorrow|\d{1,2}(?:st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2})/i;
const RISK = /\b(worried|concern|risk|blocked|hasn't|not tracked|need sign-off|dependency|skews?)\b/i;

function resolveDeadline(s: string) {
  const m = s.match(DEADLINE); if (!m) return "";
  const w = m[1].toLowerCase();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const d = days.findIndex((x) => w.includes(x));
  if (d >= 0) { let diff = (d - new Date().getDay() + 7) % 7 || 7; if (w.startsWith("next")) diff += 7; return addDays(diff); }
  if (w === "tomorrow") return addDays(1);
  if (w.includes("eod") || w.includes("end of day")) return addDays(0);
  if (w.includes("week")) return addDays(7);
  if (w.includes("month")) return addDays(30);
  return "";
}
function findOwner(line: string, speaker?: string) {
  const named = people.find((p) => new RegExp(`\\b${p.split(" ")[0]}\\b`, "i").test(strip(line)));
  if (named) return named;
  if (/^(i|i'll|i will)\b/i.test(strip(line)) && speaker) return people.find((p) => p.startsWith(speaker)) ?? speaker;
  const m = line.match(/^([A-Z][a-z]+)\s+(?:will|to)\b/); if (m) return people.find((p) => p.startsWith(m[1])) ?? m[1];
  return "Unassigned";
}

export function generateMeeting(title: string, notes: string): MeetingResult {
  if (notes.trim().length < 20) throw new Error("Add a few more lines of notes so there's enough to summarise.");
  const lines = notes.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const speakerMap = new Map<string, { words: number; pos: number; neg: number }>();
  const decisions: string[] = []; const actions: ActionItem[] = []; const inferred: string[] = [];
  for (const line of lines) {
    const sp = line.match(/^([A-Z][a-z]+):/)?.[1];
    if (sp) {
      const e = speakerMap.get(sp) ?? { words: 0, pos: 0, neg: 0 };
      const ws = line.toLowerCase().split(/\s+/); e.words += ws.length;
      e.pos += ws.filter((w) => POS.some((p) => w.startsWith(p))).length;
      e.neg += ws.filter((w) => NEG.some((p) => w.startsWith(p))).length;
      speakerMap.set(sp, e);
    }
    for (const s of sentences(line.replace(/^[A-Z][a-z]+:\s*/, ""))) {
      if (DECISION.test(s)) decisions.push(cap(strip(s)));
      else if (ACTION.test(s) && !/\?$/.test(s)) actions.push({ id: uid("ai"), text: cap(strip(s).replace(/^(i'll|i will|\w+ will|\w+ to)\s+/i, "")), owner: findOwner(s, sp), deadline: resolveDeadline(s) });
      if (RISK.test(s)) inferred.push(`Follow up on: "${strip(s)}" — flagged as a possible risk, not a decision.`);
    }
  }
  if (!actions.length && inferred.length) inferred.push("No explicit action items were stated. Consider assigning an owner to each open risk above.");
  const kws = topK(keywords(notes), 5);
  const speakers = [...speakerMap.entries()].map(([name, e]) => ({ name, words: e.words, sentiment: Math.max(-1, Math.min(1, (e.pos - e.neg) / Math.max(1, e.pos + e.neg))) }));
  const summary = `${title || "This meeting"} covered ${kws.slice(0, 3).join(", ") || "general updates"}${kws.length > 3 ? ` and ${kws[3]}` : ""}. ${speakers.length ? `${speakers.length} participants contributed; ${[...speakers].sort((a, b) => b.words - a.words)[0].name} spoke most.` : ""} ${decisions.length} decision${decisions.length === 1 ? " was" : "s were"} recorded and ${actions.length} action item${actions.length === 1 ? "" : "s"} assigned${inferred.length ? `, with ${inferred.filter((i) => i.startsWith("Follow")).length} open concern(s) worth tracking` : ""}.`.replace(/\s+/g, " ").trim();
  const nk = new Set(keywords(notes));
  const related = pastMeetings.map((m) => ({ id: m.id, title: m.title, date: m.date, overlap: m.text.split(" ").filter((w) => nk.has(w)) })).filter((m) => m.overlap.length >= 2).sort((a, b) => b.overlap.length - a.overlap.length).slice(0, 3);
  return { summary, decisions, inferred, actions, related, speakers, email: draftEmail(title, decisions, actions), generatedAt: new Date().toISOString() };
}

export function draftEmail(title: string, decisions: string[], actions: ActionItem[]) {
  return `Subject: Follow-up — ${title || "today's meeting"}

Hi team,

Thanks for the time today. A quick recap so we're aligned:

Decisions
${decisions.length ? decisions.map((d) => `• ${d}`).join("\n") : "• No final decisions were recorded."}

Action items
${actions.length ? actions.map((a) => `• ${a.text} — ${a.owner}${a.deadline ? ` (by ${a.deadline})` : ""}`).join("\n") : "• None assigned yet."}

Please reply if anything above is inaccurate or missing.

Best,
Xhanti`;
}

export function regenSummary(r: MeetingResult, title: string) {
  const owners = [...new Set(r.actions.map((a) => a.owner))].filter((o) => o !== "Unassigned");
  return `Key outcome of ${title || "the meeting"}: ${r.decisions[0] ?? "no firm decision yet"}. ${owners.length ? `${owners.join(", ")} picked up follow-ups.` : "Owners still need to be assigned."} ${r.inferred.length ? "Some concerns remain open and should be revisited next session." : "No major blockers were raised."}`;
}

/* ---------------- Planner ---------------- */
const TEMPLATES: [RegExp, string[]][] = [
  [/ship|launch|release|roll ?out/i, ["Scope & sign-off", "Build & QA", "Rollout & measure"]],
  [/reduce|cut|lower|decrease/i, ["Diagnose root causes", "Apply fixes", "Monitor results"]],
  [/hire|recruit/i, ["Define role", "Source candidates", "Interview & offer"]],
  [/write|draft|publish|report/i, ["Outline", "Draft", "Review & publish"]],
  [/research|evaluate|review|analy/i, ["Gather inputs", "Analyse", "Recommend"]],
];
const TASKS: Record<string, string[]> = {
  "Scope & sign-off": ["Confirm scope for {g}", "Get stakeholder sign-off"],
  "Build & QA": ["Build remaining pieces of {g}", "QA pass and bug fixes"],
  "Rollout & measure": ["Roll out {g} gradually", "Review metrics after rollout"],
  "Diagnose root causes": ["Pull data on {g}", "Identify top 3 root causes"],
  "Apply fixes": ["Fix highest-impact cause", "Document process change"],
  "Monitor results": ["Set up weekly tracking", "Report progress to team"],
  "Define role": ["Write job spec", "Align on interview loop"],
  "Source candidates": ["Post role & reach out", "Screen first applicants"],
  "Interview & offer": ["Run interviews", "Make offer decision"],
  Outline: ["Outline {g}", "Collect references"],
  Draft: ["Write first draft", "Add data and examples"],
  "Review & publish": ["Peer review", "Publish and share"],
  "Gather inputs": ["Collect sources for {g}", "Interview 3 stakeholders"],
  Analyse: ["Synthesise findings", "Compare options"],
  Recommend: ["Write recommendation memo", "Present to decision-makers"],
  Plan: ["Break down {g}", "Agree success criteria"],
  Execute: ["Do the core work for {g}", "Check in on progress"],
  Wrap: ["Review outcome", "Share learnings"],
};

export function generatePlan(goalsText: string, projectId: string, horizon: "day" | "week"): Task[] {
  const goals = goalsText.split(/\n+/).map((g) => g.trim()).filter(Boolean);
  if (!goals.length) throw new Error("Add at least one goal, one per line.");
  const out: Task[] = [];
  goals.forEach((goal, gi) => {
    const ms = TEMPLATES.find(([r]) => r.test(goal))?.[1] ?? ["Plan", "Execute", "Wrap"];
    const short = goal.replace(/^(ship|launch|reduce|write|research|evaluate|hire)\s+(the\s+)?/i, "").slice(0, 48);
    let prev: string | undefined;
    ms.forEach((m, mi) => {
      TASKS[m].forEach((tpl, ti) => {
        const id = uid("t");
        const step = mi * 2 + ti;
        const spread = horizon === "day" ? 0 : Math.min(6, step);
        const impact = Math.max(1, 5 - mi - (gi > 0 ? 1 : 0));
        const effort = [1, 2, 3, 2, 4, 1][step % 6];
        const priority: Priority = impact >= 4 ? "high" : impact >= 3 ? "medium" : "low";
        const urgent = spread <= 1; const important = impact >= 3;
        const quadrant: Quadrant = urgent && important ? "do" : important ? "schedule" : urgent ? "delegate" : "drop";
        out.push({
          id, title: tpl.replace("{g}", short.toLowerCase()), projectId, priority, due: addDays(spread), owner: people[(gi + step) % people.length],
          effort, impact, status: "todo", quadrant, dependsOn: prev ? [prev] : [], goal, milestone: m, origin: "planner",
          rationale: `${priority === "high" ? "High priority" : "Lower priority"}: impact ${impact}/5 for ${effort}h effort${prev ? "; waits on the previous step" : "; can start now"}.`,
        });
        prev = id;
      });
    });
  });
  return horizon === "day" ? out.filter((t) => !t.dependsOn.length || out.indexOf(t) % 6 < 2).slice(0, 8) : out;
}

/* ---------------- Research ---------------- */
const URL_RE = /^https?:\/\/\S+$/i;
export const isUrl = (s: string) => URL_RE.test(s.trim());

export function generateResearch(question: string, sources: Source[], sourceFirst: boolean, devils: boolean): ResearchResult {
  if (question.trim().length < 8) throw new Error("Write a fuller research question (at least a few words).");
  const textSources = sources.filter((s) => s.kind === "text" && s.content.trim().length > 20);
  const unfetchedUrls = sources.filter((s) => s.kind === "url").map((s) => s.content);
  const qk = new Set(keywords(question));
  const scored = textSources.flatMap((s) => sentences(s.content).map((p) => {
    const kw = keywords(p); const hits = kw.filter((w) => qk.has(w) || [...qk].some((q) => w.startsWith(q.slice(0, 5)))).length;
    return { s, p, kw, hits };
  }));
  scored.sort((a, b) => b.hits - a.hits);
  const findings: Finding[] = [];
  const used = new Set<string>();
  for (const c of scored) {
    if (findings.length >= 5 || used.has(c.p)) continue;
    used.add(c.p);
    const corroborating = scored.filter((o) => o.s.id !== c.s.id && o.kw.filter((w) => c.kw.includes(w)).length >= 2).slice(0, 1);
    const confidence = corroborating.length && c.hits ? "High" : c.hits ? "Medium" : "Low";
    findings.push({ text: c.p.replace(/[.\s]+$/, "") + ".", confidence, cites: [{ sourceId: c.s.id, passage: c.p }, ...corroborating.map((o) => ({ sourceId: o.s.id, passage: o.p }))] });
  }
  const mode: ResearchResult["mode"] = textSources.length ? (sourceFirst ? "source-first" : "mixed") : "unverified";
  if (mode === "source-first" && !findings.length) throw new Error("Source-first mode is on, but no pasted text was long enough to answer from. Paste source text or turn the mode off.");
  const topic = topK(keywords(question), 3).join(", ") || "this topic";
  const general: Finding[] = (mode === "source-first" ? [] : [
    { text: `General consideration (unverified): outcomes around ${topic} usually depend on your specific users and context — validate with your own data.`, cites: [], confidence: "Low" },
    { text: `General consideration (unverified): small, reversible experiments are typically lower-risk than a full rollout when evidence on ${topic} is thin.`, cites: [], confidence: "Low" },
  ]);
  const themes = topK(scored.flatMap((x) => x.kw), 4);
  const insights = textSources.length
    ? [`Recurring themes across your sources: ${themes.join(", ")}.`, `${findings.filter((f) => f.cites.length > 1).length} finding(s) are supported by more than one source; the rest rest on a single passage.`, ...(textSources.length < 2 ? ["Only one source was supplied, so findings can't be cross-checked."] : [])]
    : [`No sources were supplied — everything below is general AI-generated analysis about ${topic} and has not been checked against any document.`];
  const recommendations = [
    findings[0] ? `Act on the strongest finding first: "${findings[0].text.slice(0, 90)}${findings[0].text.length > 90 ? "…" : ""}"` : `Gather 2–3 sources on ${topic} before deciding.`,
    `Define one measurable success metric for ${topic} before making changes.`,
    findings.some((f) => f.confidence !== "High") ? "Verify single-source findings with an additional source or a quick data pull." : "Share the corroborated findings with stakeholders for sign-off.",
  ];
  const counterpoints = devils ? [
    findings[0] ? `The top finding may reflect a small or unrepresentative sample — how many people or data points sit behind "${findings[0].text.slice(0, 60)}…"?` : "Without sources, any recommendation here could simply mirror common assumptions.",
    `Correlation isn't causation: factors other than ${topic} could explain what the sources describe.`,
    "Consider the cost of doing nothing — is the problem large enough to justify the change?",
  ] : [];
  return { mode, findings: [...findings, ...general], insights, recommendations, counterpoints, unfetchedUrls, generatedAt: new Date().toISOString() };
}

export function compareSources(sources: Source[]) {
  return sources.filter((s) => s.kind === "text" && s.content.trim()).map((s) => {
    const sents = sentences(s.content);
    const neg = keywords(s.content).filter((w) => NEG.some((n) => w.startsWith(n))).length;
    return { id: s.id, label: s.label, claims: sents.slice(0, 2), themes: topK(keywords(s.content), 4), words: s.content.split(/\s+/).length, tone: neg > 1 ? "Critical" : neg ? "Mixed" : "Neutral / positive", hasNumbers: /\d/.test(s.content) };
  });
}
