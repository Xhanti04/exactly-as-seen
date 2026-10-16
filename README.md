# AI Workspace

A clean, modern AI productivity workspace that connects research, planning, and meetings in one place.

Built as a SaaS-style dashboard with three core tools: an **AI Research Assistant**, an **AI Task Planner**, and a **Meeting Notes Summarizer** — plus a project system that links everything together.

---

## Overview

AI Workspace is a beginner-friendly but professional AI productivity app. It gives users a single dashboard to:

- Research a topic with grounded, cited answers
- Plan goals into milestones and tasks
- Summarize meeting transcripts into decisions and action items
- Organize everything under Projects

The goal is to avoid the "three disconnected AI wrappers" problem by linking research, tasks, and meetings inside one workspace.

---

## Features Implemented

### Core Tools
- **AI Research Assistant** — ask questions, paste sources, get grounded answers with citation chips and confidence badges. Includes a Devil's Advocate toggle for counter-arguments.
- **AI Task Planner** — turn a goal into a Goal → Milestones → Tasks hierarchy with priority, due dates, and calendar export.
- **Meeting Notes Summarizer** — paste a transcript and get a structured Summary, Decisions list, and Action Items with owners and due dates. Includes follow-up email drafting.

### Dashboard
- Today's Focus widget
- Upcoming Meetings
- Active Research Threads
- Quick Actions (New Research / Plan / Meeting)
- Recent AI Activity

### Navigation & Layout
- Collapsible sidebar with icon + label
- Active state highlighting
- Top bar with project switcher, global search, theme toggle, and avatar
- Responsive design (desktop, tablet, mobile drawer)

### AI Output Handling
- Structured AI prompts with JSON schema output
- Inline-editable AI outputs with auto-save
- Section-level "Regenerate" buttons
- Persistent Responsible AI badge: *AI-generated · Verify before use*

### Responsible AI
- Persistent disclaimer badge on every AI output
- Dedicated `/responsible-ai` page explaining limits, bias, and data usage

### Data & Persistence
- Local storage persistence for all user data
- Project switching across sessions

---

## Technologies and Tools Used

**Frontend**
- Next.js 15 (App Router)
- React
- Tailwind CSS
- shadcn/ui components
- Framer Motion for transitions

**Backend / Data**
- Supabase (auth + database)
- Local storage for offline persistence

**AI**
- OpenAI / Anthropic API
- Structured JSON schema outputs

**Design**
- Custom warm-gray palette with rust accent
- Geist / Instrument Sans typography
- JetBrains Mono for labels and data
- No gradients, no emoji, no glassmorphism

**Build Tool**
- Lovable (initial build)
- Cursor / manual edits for refinement

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn
- Supabase account (for auth + database)
- OpenAI or Anthropic API key

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-workspace.git
cd ai-workspace
