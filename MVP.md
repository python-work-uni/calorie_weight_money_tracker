# MVP Specification — Personal Tracking Dashboard

**Status:** Draft for approval
**Companion doc:** `context.md` (product intent). Where they conflict, this file wins.

---

## 1. Goal

A private, single-user dashboard for tracking **calories (metric)**, **weight (kg)**, and **spending (AUD)**, usable on phone and laptop with data synced between them, protected so that nobody else can reach it or the data behind it — even knowing the URL.

The one differentiating feature: an **AI agent** that turns a loose natural-language description ("I went to a Korean BBQ buffet and grilled a lot of meat") into itemised calorie entries using live web searches, which you review and approve before anything is saved.

## 2. Definition of done (MVP)

The MVP ships when all of these are true:

1. Logging in from a phone and a laptop shows the **same data**.
2. Landing on the site without logging in reveals **no data and no usable endpoints**, regardless of what is typed in the URL or browser console.
3. Weight, calories, and spending each have a working log plus at least **two meaningful charts**.
4. Given a free-text meal description, the AI proposes **per-item rows in grams**, the UI shows them as editable drafts, and nothing is written to the database until you approve.
5. TDEE is computed from your profile and shown as the target line on the calorie chart.
6. The insights page can read your spending and weight data and produce a written summary with at least one concrete reduction tip.
7. All of it runs on free tiers.

## 3. Decisions made

Items the previous review left open, now resolved. Anything marked **assumed** is my call — say so if you disagree.

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Password / access model | **Real auth, not a gate.** Supabase Auth (email + password or magic link), public signup disabled after your account exists. | You said nobody else may access the data. Only server-verified auth achieves that on a static host. |
| 2 | Multi-device | **Yes — synced.** Server-side database, not `localStorage`. | Laptop + phone is a hard requirement; local storage cannot sync. |
| 3 | Hosting | **GitHub Pages (frontend) + Supabase (auth, database, edge functions).** | Keeps your chosen host and the $0 target while making #1 and #2 possible. |
| 4 | Data at rest | Lives in Supabase Postgres, protected by row-level security. Your device may cache it for speed, never as the source of truth. | Consistency across devices. |
| 5 | AI provider | **OpenRouter**, called from the edge function with its **web-search plugin** enabled. The model sits behind an adapter so it can be swapped. | OpenRouter is built for applications, and its web search is a documented API feature returning citations — which this app needs. Full rationale in §15. |
| 6 | API key exposure | Stored as an **edge-function secret**, never sent to the browser. | A key in client code is public the moment anyone opens devtools. |
| 7 | AI scope | **Calories (propose entries) + Insights (analyse data).** No AI for weight/spending entry in MVP. | The two jobs you actually asked for; keeps surface area small. |
| 8 | AI accuracy | Model proposes; **all AI numbers are labelled "estimated"**, with sources shown when a search was used. You always approve. | LLM calorie numbers are plausible, not authoritative. |
| 9 | Food entry granularity | **One row per item**, weight in **grams**. | Your explicit answer; also makes the AI output verifiable item by item. |
| 10 | Categories | Curated **presets, user-extendable**, AI assigns on calorie proposals. | Your explicit answer. |
| 11 | TDEE | **Mifflin-St Jeor**, with activity multiplier and a **goal mode: cut / maintain / bulk** and a deficit/surplus size. Target is derived live from your latest logged weight. | You asked for a built-in calculator in Profile; the goal mode is what makes the "intake vs target" chart meaningful. **Assumed** goal mode exists. |
| 12 | Currency | **AUD**, formatted as `$1,234.56`. | Your answer. |
| 13 | Backup | **Export to JSON (full) and CSV (per dataset)** shipped in MVP. | Cheap to build; the difference between an inconvenience and losing years of data. |
| 14 | Mobile | **Mobile-first layout**, installable as a **PWA** (home-screen icon, standalone window). | You log mostly from your phone. Offline *writes* are explicitly out of scope. |
| 15 | Framework | **React + TypeScript + Vite**, Tailwind CSS, Recharts. | Static build, works on Pages, huge ecosystem for the charts. **Assumed** — no preference was given. |
| 16 | History | **Starts empty**, but the export format is the same as the import format so backfilled data can be added later. | Avoids building an importer for data that may not exist. |

## 4. Architecture

```
        ┌──────────────────────────────┐
        │  GitHub Pages (static)       │
        │  React UI + charts           │
        │  no secrets, public code     │
        └──────────────┬───────────────┘
                       │  HTTPS + JWT
        ┌──────────────▼───────────────┐
        │  Supabase                    │
        │  ├─ Auth (you only)          │
        │  ├─ Postgres + RLS           │  ← your data, unreachable without a valid token
        │  └─ Edge Function (AI proxy) │  ← holds the LLM key
        └──────────────┬───────────────┘
                       │
                 ┌─────▼─────┐
                 │ LLM + web │
                 │  search   │
                 └───────────┘
```

Three security properties this buys us:

- The repo can stay public — it contains only code, never data or keys.
- The database rejects any query that doesn't carry your authenticated token.
- The AI key lives in one server-side place; the browser never sees it.

**Note:** free tiers can change and cold starts add a second or two to first load. Acceptable for personal use; noted as a risk in §12.

## 5. Tech stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Routing | React Router (with the Pages SPA fallback in §12) |
| Auth + DB | Supabase (`@supabase/supabase-js`) |
| Serverless | Supabase Edge Functions (Deno) |
| Deploy | GitHub Actions → GitHub Pages |
| Dates | `date-fns` |
| Validation | Zod (AI output + forms) |

## 6. Data model

All tables carry `user_id` and an RLS policy of `user_id = auth.uid()`.

**`profiles`** (one row per user)
`user_id`, `height_cm`, `date_of_birth`, `sex` (for Mifflin-St Jeor), `activity_level`, `goal_type` (`cut`/`maintain`/`bulk`), `goal_rate` (kg/week), `timezone` (default `Australia/Sydney`), `created_at`, `updated_at`

**`weight_logs`**
`id`, `user_id`, `date`, `weight_kg`, `note`, `created_at`
Constraint: one entry per date (editing an entry overwrites it).

**`food_entries`**
`id`, `user_id`, `date`, `name`, `grams`, `kcal`, `category_id`, `source` (`manual` / `ai`), `ai_job_id` (nullable), `note`, `created_at`
Optional macro fields (`protein_g`, `carbs_g`, `fat_g`) are stored but not charted in MVP.

**`food_categories`**
`id`, `user_id`, `name`, `is_preset`, `icon`, `color`

**`spending_entries`**
`id`, `user_id`, `date`, `amount_aud`, `category_id`, `description`, `note`, `created_at`

**`spending_categories`**
`id`, `user_id`, `name`, `is_preset`, `icon`, `color`

**`ai_jobs`** (audit trail for the agent)
`id`, `user_id`, `kind` (`calorie_proposal` / `insight`), `input_text`, `status` (`pending` / `approved` / `discarded` / `failed`), `payload` (raw model output), `sources` (search URLs), `error`, `created_at`

Why keep `ai_jobs`: you can see what the model actually said and where it looked, and debug bad estimates instead of guessing.

**Target calculation** (not stored; derived):

```
BMR  = 10*kg + 6.25*cm − 5*age + (sex == male ? 5 : −161)
TDEE = BMR × activity_multiplier
target_kcal = TDEE ± goal_adjustment
```

`kg` is your most recent `weight_logs` entry, so the target drifts as your weight changes. Displayed target is rounded to the nearest 10 kcal.

## 7. Screens

Mobile-first; a bottom tab bar on small screens, a sidebar on desktop.

| Screen | Contents |
|---|---|
| **Login** | Email + password (or magic link). No signup form in the UI — your account is provisioned once. |
| **Today** | Default landing page. Calorie ring (consumed vs target), today's food list, quick-add spending, quick-add weight. |
| **Calories** | Day view with add/edit/delete; entry form takes name, grams, kcal, category. Nav to charts and to the AI agent. |
| **Calorie charts** | Daily kcal vs target (bar + target line), 7/30/90-day trend, kcal by category (donut). |
| **AI agent** | Free-text box, "Propose entries" button, progress indicator, then draft rows. |
| **Weight** | Line chart with 7-day rolling average, change over a selected range, current vs goal. |
| **Spending** | Expense list with add/edit/delete; entry form takes description, amount, date, category. |
| **Spending charts** | Spend over time, spend by category, top categories, month-over-month. |
| **Insights** | AI-written summary of spending and weight trends with actionable tips. |
| **Profile** | Height, DOB, sex, activity, goal mode, goal rate, timezone; shows computed BMR/TDEE/target. Also **export** buttons. |
| **Categories** | Manage food and spending categories. |

## 8. Feature detail

### 8.1 Calorie tracking
- Manual entry: name, grams, kcal, category. Grams optional (some items are naturally unit-based), kcal required.
- Day total, remaining vs target, and a progress ring on **Today**.
- Editing and deleting any entry.
- AI-created entries are visually distinct and link back to the job that produced them.

### 8.2 AI calorie agent (the important one)
Flow:

1. You type a description, e.g. *"Korean BBQ buffet — grilled bulgogi, short rib, pork belly, some kimchi and rice, about 2 hours of eating."*
2. The edge function (authenticated) calls **OpenRouter** with the **web plugin** enabled (see §15) and a strict output schema.
3. The model returns items:
   ```json
   {
     "items": [
       { "name": "Beef bulgogi", "grams": 200, "kcal": 430,
         "category": "Meat", "confidence": "medium",
         "basis": "search", "source": "https://…" }
     ],
     "assumptions": ["Assumed 2 servings of rice"],
     "total_kcal": 1850
   }
   ```
4. Responses are validated with Zod. Malformed output becomes a failed job, never a broken form.
5. The UI renders each item as an **editable draft row** — change grams, kcal, or category; untick anything you didn't eat.
6. Buttons: **Approve selected** (inserts into `food_entries`, sets job `approved`) or **Discard** (sets job `discarded`, writes nothing).
7. Sources and stated assumptions are shown above the table, so you can judge the numbers.

Rules:
- **Nothing is persisted before approval.** This is non-negotiable and is the specification's central safety property.
- Every AI number is badged *estimated*; anything backed by a search shows its source.
- If the model returns low confidence, the row is flagged for your attention rather than silently accepted.
- **Requests retry automatically.** The chosen model is a free endpoint with imperfect reliability, so the edge function retries transient failures and repairs malformed output before giving up. Retrying is safe because nothing is written before approval. Full policy in `IMPLEMENTATION_PLAN.md` §9.

### 8.3 Weight tracking
- One measurement per date; logging the same date again edits it.
- Line chart with raw weights plus a 7-day rolling average to cut daily noise.
- Change over the selected range (e.g. "−2.4 kg in 30 days").
- Optional goal weight with a progress indicator.

### 8.4 Spending tracking
- Entry: description, amount (AUD), date, category.
- Charts: spend per day/week/month, category donut, top categories, month-over-month comparison.
- Month view with running total vs. the previous month.

### 8.5 Insights agent
- Runs on demand from the Insights screen.
- Sends **aggregates** where possible (category totals, monthly sums, weight trend, calorie adherence) rather than every raw row — less data leaves your account, and the model reasons better on summaries anyway.
- Output: a short written summary plus explicit tips, e.g. *"Your top category is Eating out at $412 (38% of spend). Cutting two takeaway meals a week would save roughly $90/month."*
- Rendered as readable prose; stored in `ai_jobs` so history is available.

### 8.6 Categories
- Presets for food (e.g. Meat, Vegetables, Grains, Dairy, Drinks, Snacks, Eating out) and spending (Groceries, Eating out, Transport, Bills, Health, Entertainment, Other).
- You can add your own to either list.
- AI calorie proposals must map to an existing category (or propose a new one, which you confirm) — it never invents silent categories.

### 8.7 Export
- **Full JSON** — everything, round-trips with import.
- **Per-dataset CSV** — weight, food, spending, for spreadsheets.
- These exist because the data is valuable and cloud-only data with no exit is a trap.

## 9. Security requirements

- Row-level security **on every table**, `user_id = auth.uid()`, default-deny. Tested by attempting a read with a different/absent token.
- Public signups disabled after your account is created.
- The edge function validates the caller's JWT before doing anything, and is the **only** holder of the LLM key.
- No secret in the repo or the built bundle. Verified by grepping the build output for the key before shipping.
- Auth session persisted in the browser; logout clears it.
- The threat model is: *a stranger with the URL*. It is not: a hostile government or a compromised device. Stated so nobody over-promises.

## 10. Non-functional

- **Performance:** first load under ~3s on 4G; the AI call is the only slow path and gets a progress indicator.
- **Cost:** free tiers for hosting, DB, and functions. The LLM key is paid per your provider's rates; web-search calls are the main variable cost.
- **Error handling:** AI failure shows a retry and leaves manual entry untouched; DB failure never silently drops a log.
- **Accessibility:** charts paired with numeric summaries; tap targets ≥ 44px.
- **Timezone:** "today" resolves against `profiles.timezone`, so an 11pm entry on your phone lands on the right date.

## 11. Build order

| Phase | Deliverable | Checkpoint |
|---|---|---|
| M0 | Repo scaffold, Vite + React + TS + Tailwind, GitHub Actions → Pages, routed shell | Site loads from the Pages URL |
| M1 | Supabase project, schema + RLS, auth, login screen, route guard | Can log in; a second user cannot exist |
| M2 | Profile + TDEE calculator | BMR/TDEE/target display and persist |
| M3 | Weight logging + chart | Log and chart a weight series |
| M4 | Manual calorie logging, categories, charts | Log a day and see it against target |
| M5 | **AI calorie agent** + approval flow + web search | The Korean BBQ test produces approvable rows |
| M6 | Spending logging + charts | Log a month and see category breakdown |
| M7 | Insights agent | Written summary with a real tip |
| M8 | Export, PWA, polish, RLS review | Installable; exported data round-trips |

M5 is the highest-risk item and the reason the project exists; M4 is deliberately placed before it so there is a working manual fallback if the agent misbehaves.

## 12. Risks

| Risk | Mitigation |
|---|---|
| **SPA routing breaks on GitHub Pages** — deep links 404 because there is no server rewrite | Use a `404.html` fallback that rehydrates the route, and set the Vite `base` to `/calorie_weight_money_tracker/` (project sites are served from a subpath, not the domain root). |
| **RLS misconfigured** — the whole point of the architecture fails quietly | Explicit test in M1: query with no token and with a wrong token and confirm zero rows. |
| **AI estimates are confidently wrong** | Always badged estimated, sources shown, approval mandatory. |
| **Web searches make estimates slow or costly** | Cache results per description; cap searches per request; show progress. |
| **Free-tier limits or cold starts** | Aggressive caching of derived data; documented as an accepted tradeoff. |
| **Key leaks into the bundle** | Grep the built output for the key as a release check. |
| **Cloud-only data loss** | JSON export from M8 (and it is a single-user app, so export doubles as backup). |

## 13. Explicitly out of scope for MVP

Multi-user or sharing, offline writes, native mobile apps, bank/CSV transaction import, barcode scanning, macro targets and macro charts, workouts/exercise calories, reminders and notifications, dark mode, i18n. All are plausible v2 items, none are needed to prove the product works.

## 14. Open items

All confirmed. No blockers remain.

1. **Profile fields** — Mifflin-St Jeor confirmed (height, DOB, sex, activity). ✅
2. **PWA install** — wanted. ✅
3. **Starting model** — `inclusionai/ling-3.0-flash-fin:free`, with two caveats recorded in §15. ✅

## 15. AI provider: OpenRouter

**Decision.** The edge function calls OpenRouter. The key is stored as an edge-function secret and never reaches the browser.

**Web search is the deciding factor.** OpenRouter exposes it as a first-class API feature rather than something to bolt on:

- Enable it by appending `:online` to the model slug, passing the `web` plugin, or using the preferred `openrouter:web_search` server tool.
- Results return as `url_citation` annotations, which map directly onto the "show your sources" requirement in §8.2.
- Search uses the model provider's native search where available (OpenAI, Anthropic, Google, Perplexity), and falls back to Exa otherwise. `engine` and `max_results` are configurable, and `include_domains`/`exclude_domains` can bias toward nutrition sources.

**Cost.** On the default Exa engine the web plugin is about **$0.007 per search** (up to 10 results), on top of token usage. A buffet entry needing two or three searches costs a couple of cents. Cap `max_results` and cache results per description to keep it there.

**Why not OpenCode Go.** Go is cheaper for heavy use and does expose OpenAI-compatible endpoints, but two things rule it out for this app:

1. It is documented as being *for coding agents*; traffic is monitored for abuse and clients are expected to identify themselves with a coding-agent user agent and a session header. A calorie dashboard is off-label, so it risks throttling.
2. It offers **no web-search tool**. The search requirement would mean adding a separate search provider (Exa, Tavily, Brave) and a second key anyway — at which point OpenRouter does both in one place.

OpenCode **Console** (pay-as-you-go) has the same gap: its hosted Websearch is wired to the OpenCode client's managed config, not exposed as an API an external app can call.

### 15.1 Model choice and its two caveats

Chosen model: **`inclusionai/ling-3.0-flash-fin`** (free variant: `inclusionai/ling-3.0-flash-fin:free`), 262k context.

Verified against OpenRouter's live model list, which surfaced two things worth recording:

1. **The free variant does not advertise `structured_outputs` or `response_format`** (the paid `inclusionai/ling-3.0-flash-fin` does). So the agent cannot rely on `response_format: json_schema` while on the free slug. It **does** support `tools` and `tool_choice`, so structured output is obtained by **forcing a tool call** whose parameters are the entry schema. This works on both slugs and keeps the model swappable — see the implementation plan.
2. **The `:free` variant conflicts with the privacy goal.** OpenRouter documents that it routes to providers that may train on prompts depending on account settings, with separate controls for paid and free models. Free endpoints commonly log or publish prompts. Since the insights agent reads spending and weight data, and the project's first requirement is that nobody else can access that data, the paid slug is the safer choice. At `$0.06`/`$0.18` per 1M input/output tokens, the paid model costs a fraction of a cent per request — the free tier saves essentially nothing here.

**Recommendation:** use the paid `inclusionai/ling-3.0-flash-fin`. The model is identical; only the billing and data policy differ. This is a single config value, so it can be flipped at any time.

**Privacy.** Avoid `:free` and stealth models for anything touching spending or weight. Pin to a provider with a stated zero-retention policy.

**Swappability.** The model ID lives in one config constant and is read by the edge function, so changing it is a one-line edit rather than a rewrite.


