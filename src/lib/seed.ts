import type { State } from "./store";
import { addDays } from "./dates";

export function seed(): State {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60000).toISOString();
  return {
    currentProjectId: "p1",
    goals: "Ship the Q4 onboarding redesign to 100% of new signups\nReduce support ticket backlog below 40",
    projects: [
      { id: "p1", name: "Onboarding Redesign", description: "Rebuild first-run experience to lift week-1 activation from 38% to 50%.", color: 1, createdAt: addDays(-30) },
      { id: "p2", name: "Support Operations", description: "Cut response time and backlog for the customer support queue.", color: 2, createdAt: addDays(-45) },
      { id: "p3", name: "Pricing Review 2027", description: "Evaluate usage-based tiers ahead of the January price change.", color: 3, createdAt: addDays(-12) },
    ],
    tasks: [
      { id: "t1", title: "Finalise onboarding checklist copy", projectId: "p1", priority: "high", due: addDays(0), owner: "Amara Okafor", effort: 2, impact: 4, status: "in-progress", quadrant: "do", dependsOn: [], goal: "Ship the Q4 onboarding redesign", milestone: "Content ready", origin: "manual" },
      { id: "t2", title: "Run usability test with 5 trial users", projectId: "p1", priority: "high", due: addDays(2), owner: "Liam Chen", effort: 4, impact: 5, status: "todo", quadrant: "do", dependsOn: ["t1"], goal: "Ship the Q4 onboarding redesign", milestone: "Validated design", origin: "manual" },
      { id: "t3", title: "Instrument activation funnel events", projectId: "p1", priority: "medium", due: addDays(4), owner: "Sipho Ndlovu", effort: 3, impact: 4, status: "todo", quadrant: "schedule", dependsOn: [], goal: "Ship the Q4 onboarding redesign", milestone: "Measurement in place", origin: "manual" },
      { id: "t4", title: "Triage 25 oldest billing tickets", projectId: "p2", priority: "high", due: addDays(-1), owner: "Xhanti Qashani", effort: 2, impact: 3, status: "missed", quadrant: "do", dependsOn: [], goal: "Reduce support backlog", milestone: "Backlog under control", origin: "manual" },
      { id: "t5", title: "Draft macro replies for top 10 questions", projectId: "p2", priority: "medium", due: addDays(3), owner: "Priya Raman", effort: 3, impact: 4, status: "todo", quadrant: "schedule", dependsOn: [], origin: "manual" },
      { id: "t6", title: "Update team wiki formatting", projectId: "p2", priority: "low", due: addDays(9), owner: "Priya Raman", effort: 1, impact: 1, status: "todo", quadrant: "drop", dependsOn: [], origin: "manual" },
      { id: "t7", title: "Collect competitor pricing pages", projectId: "p3", priority: "medium", due: addDays(1), owner: "Liam Chen", effort: 1, impact: 2, status: "done", quadrant: "delegate", dependsOn: [], origin: "manual" },
    ],
    blocks: [
      { id: "b1", title: "Finalise onboarding checklist copy", taskId: "t1", day: 0, start: 9, duration: 2 },
      { id: "b2", title: "Weekly product sync", day: 0, start: 13, duration: 1 },
    ],
    meetings: [
      {
        id: "m1", title: "Onboarding redesign — weekly sync", date: addDays(0), projectId: "p1",
        notes: `Amara: Checklist copy is nearly done, I need sign-off from legal on the data consent step.
Liam: Usability sessions are booked for Thursday with five trial users. I'm a bit worried the recruiting skews toward power users.
Sipho: Funnel events are not tracked yet. We agreed to use the existing analytics schema rather than a new one.
Amara: Decided to drop the video tour from v1, it tested poorly.
Liam will share the test script with the team by Wednesday.
Sipho to instrument the activation events by Friday.
Xhanti: Concern that marketing hasn't seen the new welcome email yet.`,
      },
      { id: "m2", title: "Support backlog review", date: addDays(-7), projectId: "p2", notes: "Priya: Backlog is at 112 tickets, billing questions are 40%.\nXhanti: We agreed to create macro replies for billing.\nPriya will draft macros by next Monday." },
    ],
    research: [
      {
        id: "r1", question: "Should we add a progress checklist to onboarding?", projectId: "p1", sourceFirst: true, devils: false, updatedAt: ago(180),
        sources: [
          { id: "s1", label: "Internal user interviews (Sept)", kind: "text", content: "Seven of twelve interviewed trial users said they did not know what to do after creating their first workspace. Users who completed three setup steps in the first session were far more likely to return the next day. Several users described the current empty dashboard as intimidating." },
          { id: "s2", label: "Support ticket analysis", kind: "text", content: "Roughly 30% of onboarding-related tickets ask how to invite teammates. Tickets mentioning the setup wizard dropped after the tooltip change in July. Customers on the Team plan open more onboarding tickets than Starter customers." },
        ],
      },
    ],
    activity: [
      { id: "a1", kind: "research", text: "Research thread started: progress checklist in onboarding", at: ago(180), href: "/research" },
      { id: "a2", kind: "planner", text: "Daily plan generated with 4 focus blocks", at: ago(320), href: "/planner" },
      { id: "a3", kind: "meeting", text: "Summary generated for Support backlog review", at: ago(1500), href: "/meetings" },
    ],
  };
}

export const pastMeetings = [
  { id: "pm1", title: "Q3 activation retrospective", date: addDays(-34), text: "activation checklist welcome email video tour consent legal funnel analytics onboarding" },
  { id: "pm2", title: "Analytics schema planning", date: addDays(-21), text: "analytics schema events funnel tracking instrumentation dashboard" },
  { id: "pm3", title: "Marketing x Product alignment", date: addDays(-14), text: "marketing welcome email launch messaging campaign brand" },
  { id: "pm4", title: "Billing support escalation", date: addDays(-10), text: "billing tickets backlog macros refunds invoices support" },
  { id: "pm5", title: "Pricing tiers kickoff", date: addDays(-8), text: "pricing tiers usage competitors january plans revenue" },
];

export const people = ["Xhanti Qashani", "Amara Okafor", "Liam Chen", "Sipho Ndlovu", "Priya Raman"];
