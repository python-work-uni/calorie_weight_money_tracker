# Project Context — Personal Tracking Dashboard

## Purpose

A single personal dashboard for tracking three things side by side:

1. **Calories** — using metric system measurements
2. **Weight** — in kilograms
3. **Spending** — money tracking

Every tracked area must have clear graphic visualizations, not just tables of numbers.

## Hosting & Access

- **Resolved:** see `MVP.md` §3–§4. Summary: GitHub Pages serves the static UI, and Supabase provides real authentication, the synced database, and a server-side place to hold the AI key.
- Requirement is **real access control, not a soft gate**: nobody else may reach the site or its data even knowing the URL, and the same data must appear on both laptop and phone.
- A client-side password on a static host cannot satisfy this (anyone can read the JavaScript and skip the check), which is why the backend exists. Local-only storage was rejected because it cannot sync across devices.
- The code repository may stay public — it holds code only, never data or secrets.

## Feature Requirements

### 1. Calorie Tracking

- Metric system throughout (grams, kilograms, milliliters, kilojoules/kilocalories as appropriate — no imperial units).
- Daily logging of food entries with calorie totals.
- Visualizations: at minimum, daily intake vs. target, and trend over time.

### 2. AI-Assisted Calorie Entry (fallback path)

- An **in-built AI agent** on the site acts as a fallback when manual entry is impractical.
- It takes a rough natural-language description and proposes **calorie entries** the user would otherwise have to estimate by hand.
- **Human approval is required**: the AI proposal is a draft, and nothing is saved until the user reviews and confirms it.
- Canonical example: *"I went to a Korean BBQ buffet and grilled and ate many cuts of meat and hot food."* From that loose description the agent should propose a set of plausible entries (estimated portions, cuts, sides) — and the user then approves, edits, or discards them.

### 3. Weight Tracking

- Recorded in **kilograms**.
- Visualizations: weight-over-time line chart, plus change over a chosen period.

### 4. Spending Tracking

- Log expenses with amount, date, and category.
- Visualizations: spending by category, and spending over time.

## Deployment Notes / Decisions

All previously open technical questions are now decided in `MVP.md` §3. In brief:

- **Password mechanism** → real auth via Supabase (public signup disabled), not a client-side gate.
- **Where data lives** → Supabase Postgres with row-level security, cached on device but never device-only, because laptop + phone sync is required.
- **AI agent backing** → **OpenRouter**, called from a Supabase Edge Function; the browser never sees the key. OpenRouter supplies the **web search** used to improve calorie estimates. See `MVP.md` §15.
- **Framework** → React + TypeScript + Vite, Tailwind CSS, Recharts.

Additional resolved product details: currency is **AUD**; the AI agent covers **calorie proposals** and a **data-insights page** (spending/weight analysis and tips); food entries are **per item, in grams**; categories are **preset plus user-addable**, and the AI assigns them.

## Status

- `context.md` records product intent; `MVP.md` is the build specification; `IMPLEMENTATION_PLAN.md` is the agent-ready build plan (milestones, verification, traps).
- No code written yet.
