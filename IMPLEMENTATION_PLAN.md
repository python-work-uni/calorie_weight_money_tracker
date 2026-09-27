# Implementation Plan — Personal Tracking Dashboard

**Audience:** an autonomous coding agent (or a human pairing with one).
**Read first:** `MVP.md`. It is the specification; this file is the how. If they conflict, `MVP.md` wins and you update this file.
**Companion:** `context.md` (product intent).

---

## 0. Operating rules for the agent

These exist so a fresh session can pick up any milestone without re-deriving context.

1. **Read `MVP.md` §3–§8 before writing code for any milestone.** Do not invent product behaviour; it is specified.
2. **One milestone at a time.** Complete its *Verify* step before starting the next. A milestone with a failing verification is not done.
3. **Run the verification, don't eyeball it.** Every milestone lists a concrete check. Paste the output or observed result into the milestone's completion note.
4. **Never proceed past a failed check by guessing.** If a fix fails twice, stop and report what you tried.
5. **Commit after each passing verification**, one commit per milestone, message `M<n>: <what>`.
6. **Do not add a dependency without a one-line justification** in the commit body. Prefer the standard library and what is already installed.
7. **If a documented fact here turns out to be wrong**, fix this file in the same commit as the code change.
8. **Ask the human only at the Decision Gates in §7.** Everything else has a specified default.

### Invariants — violating any of these is a bug, not a tradeoff

- **No secret** in the repo, in `VITE_*` env vars, or in the built bundle. The OpenRouter key lives only in the Supabase edge function.
- **RLS enabled on every table**, policy `user_id = auth.uid()`, default deny. No table is ever readable without a token.
- **AI output is never persisted before explicit user approval.** Draft rows live in component state only.
- **AI output is never trusted unvalidated.** Parse and validate before it reaches the UI.
- **Mobile-first.** Every screen must be usable at 375px wide.
- **`service_role` key never leaves the server.** Never reference it in `src/`.

---

## 1. Ground truth — do not re-derive

| Fact | Value |
|---|---|
| Repository | `https://github.com/python-work-uni/calorie_weight_money_tracker.git` |
| Pages URL | `https://python-work-uni.github.io/calorie_weight_money_tracker/` |
| Vite `base` | `/calorie_weight_money_tracker/` (project site, **must** be set) |
| Auth + DB | Supabase (Postgres + RLS + Auth) |
| AI gateway | OpenRouter, `https://openrouter.ai/api/v1/chat/completions` |
| AI model (default) | `inclusionai/ling-3.0-flash-fin` — see MVP.md §15.1 |
| Web search | OpenRouter `web` plugin, `max_results: 3` |
| Currency | AUD, rendered `$1,234.56` |
| Units | kg, grams, kcal |
| Timezone | `profiles.timezone`, default `Australia/Sydney` |

**Model capability note (verified):** `inclusionai/ling-3.0-flash-fin:free` does **not** list `structured_outputs`/`response_format`. Both slugs list `tools` and `tool_choice`. **Therefore: obtain structured output via a forced tool call, never via `response_format`.**

### Environment variables

| Name | Where | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | build / GitHub Actions | no |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build / GitHub Actions | no (RLS protects data) |
| `OPENROUTER_API_KEY` | Supabase edge function secret | **yes** |
| `OPENROUTER_MODEL` | Supabase edge function secret | no (config) |

Note: Supabase now issues **publishable** keys (`sb_publishable_…`) in place of the older
**anon** JWT keys. They occupy the same role — public, client-side, protected by RLS. This
project uses the publishable key and names the variable accordingly.

### Prerequisites the human must perform (cannot be automated)

- **Enable GitHub Pages** once: repo → Settings → Pages → *Build and deployment* → Source = **GitHub Actions**. The workflow cannot do this itself; `actions/configure-pages` fails with "Get Pages site failed" until it is enabled, so every deploy fails until then. (Verified in M0: `npm ci` and `npm run build` both pass; only this step fails.)
- Create the Supabase project; provide URL + publishable key.
- Run `supabase login` and `supabase link --project-ref <ref>` once, locally. `link` prompts for the database password, so it is interactive and cannot be scripted here.
- Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` as function secrets.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as **repo secrets**, and pass them into the build step (M1).
- Create the single user account (sign in once) — then **disable public signups**. Verified live: `disable_signup` starts `false`, so this step is required.

---

## 2. Target file layout

```
├─ .github/workflows/deploy.yml      # build + publish to Pages
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts                    # base + Tailwind v4 plugin (Tailwind config lives in src/index.css)
├─ public/
│  ├─ 404.html                       # SPA deep-link fallback
│  ├─ manifest.webmanifest           # PWA
│  └─ icon-192.png, icon-512.png
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                        # routes
│  ├─ lib/
│  │  ├─ supabase.ts                 # client singleton
│  │  ├─ tdee.ts                     # Mifflin-St Jeor + goal adjustment
│  │  ├─ format.ts                   # money/kg/kcal formatters
│  │  └─ dates.ts                    # timezone-aware "today", ranges
│  ├─ hooks/
│  │  ├─ useSession.ts
│  │  ├─ useFood.ts  useWeight.ts  useSpending.ts  useCategories.ts
│  ├─ components/
│  │  ├─ Layout.tsx                  # tab bar / sidebar
│  │  ├─ RequireAuth.tsx
│  │  ├─ charts/  {CalorieTrend,WeightTrend,SpendByCategory,...}.tsx
│  │  └─ ui/      {Button,Input,Modal,Card,...}.tsx
│  └─ routes/
│     ├─ Login.tsx  Today.tsx  Profile.tsx  Categories.tsx
│     ├─ Calories.tsx  CalorieCharts.tsx  AiAgent.tsx
│     ├─ Weight.tsx  Spending.tsx  SpendingCharts.tsx  Insights.tsx
└─ supabase/
   ├─ migrations/
   │  ├─ 0001_schema.sql
   │  └─ 0002_rls.sql
   └─ functions/ai/index.ts          # the only holder of OPENROUTER_API_KEY
```

---

## 3. Milestones

Every milestone: **Goal → Tasks → Verify → Done when.** Do not merge milestones.

### M0 — Scaffold and deploy pipeline

**Goal:** an empty but routed app is live at the Pages URL.

**Tasks**
1. `npm create vite@latest . -- --template react-ts`, then add Tailwind, React Router, Recharts, `@supabase/supabase-js`, `date-fns`, `zod`.
2. Set `base: '/calorie_weight_money_tracker/'` in `vite.config.ts`. Add a route-based 404 fallback (`public/404.html` that redirects to `/index.html` preserving the path) — without this, deep links 404 on Pages.
3. Add `Layout.tsx` with placeholder routes for every screen in MVP.md §7. No data yet.
4. Add `.gitignore` (`node_modules`, `dist`, `.env*`).
5. Add `.github/workflows/deploy.yml`: on push to `main`, build and publish `dist` via `actions/deploy-pages`.

**Verify**
- `npm run build` succeeds locally.
- After push: the Pages URL loads and client-side navigation between placeholder routes works.
- **Deep-link test:** open `/calorie_weight_money_tracker/spending` directly in a fresh tab; it must render, not 404. This is the trap in §4.

**Done when:** both the root URL and a deep link render on Pages.

---

### M1 — Database, RLS, and auth

**Goal:** you can log in; nobody else can read anything.

**Tasks**
1. `0001_schema.sql`: create the seven tables from MVP.md §6 with FKs and indexes on `(user_id, date)`.
2. `0002_rls.sql`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on **every** table, plus four policies (select/insert/update/delete) each constrained to `user_id = auth.uid()`. For `insert`, also `WITH CHECK`.
3. `src/lib/supabase.ts`: client from `VITE_*` env vars.
4. `useSession.ts` + `RequireAuth.tsx`: redirect unauthenticated users to `/login`; wrap every non-login route.
5. `Login.tsx`: email + password. **No signup form.**
6. Seed preset categories (food + spending lists from MVP.md §8.6) on first profile creation.

**Verify** — this is the milestone's whole point, do all three:
1. Log in from a browser; navigate to a data route. It works.
2. **Anonymous write check (the decisive one).** `POST` a plausible row to *every* table at the REST endpoint using only the publishable key, with no user token. Every request must be denied with `42501 new row violates row-level security policy`.
   ```bash
   curl -s -w " |HTTP:%{http_code}" -X POST \
     "https://<ref>.supabase.co/rest/v1/food_entries" \
     -H "apikey: <publishable key>" -H "Content-Type: application/json" \
     -d '{"user_id":"00000000-0000-0000-0000-000000000000","date":"2000-01-01","name":"probe","kcal":1}'
   ```
   `42501` proves RLS is enabled *and* that the policy denied the write. A `201` means RLS is off on that table — a critical failure, and the probe row must be deleted.
3. **Anonymous read check.** `SELECT` from each table anonymously; expect `[]` and never rows.

> Do **not** rely on the anonymous read check alone. While the tables are empty it returns `[]` whether or not RLS is enabled, so it cannot distinguish "denied" from "nothing to see". The insert check in step 2 is the one that actually proves the property.

For a raw catalog view when a `psql` connection is available:
```sql
select relname, relrowsecurity from pg_class
where relname in ('profiles','weight_logs','food_entries','food_categories',
                  'spending_entries','spending_categories','ai_jobs');
```

**Done when:** every table denies the anonymous write and the owner can read their own rows. **This is a Decision Gate — report the results before M2.**

---

### M2 — Profile and TDEE

**Goal:** the app knows your body stats and computes a target.

**Tasks**
1. `src/lib/tdee.ts`: Mifflin-St Jeor exactly as MVP.md §6, returning `{bmr, tdee, target_kcal}`. Pure function, no I/O.
2. `src/lib/dates.ts`: `todayInTimeZone(tz)`, so "which day is this?" never depends on the host zone.
3. `Profile.tsx`: form for height, DOB, sex, activity, goal type, goal rate, timezone — plus **weight today**, which upserts `weight_logs` for the current date.
   *Deliberate deviation:* the target cannot be computed without a weight, and M3 (weight logging) comes later, so the milestone would otherwise be unverifiable. The user described Profile as "a page to log data about myself like weight, height, age", so writing a weight here matches that intent. It **upserts** on `(user_id, date)`, so it cannot create the duplicate rows M3 forbids.
4. Display BMR / TDEE / target, target rounded to nearest 10 kcal, recomputed on every keystroke.
5. **Unit tests** for `tdee.ts` (known cases across sex/goal) and `dates.ts` (day-boundary cases), beside each module.

**Verify**
- `npm test` passes the TDEE cases.
- Change activity level in the UI; the displayed target updates immediately.
- Reload the page; the profile persists.

**Done when:** target recomputes live and survives a reload.

---

### M3 — Weight tracking

**Goal:** log weight and see it charted.

**Tasks**
1. `useWeight.ts`: CRUD against `weight_logs`, upsert on `date` (one entry per date).
2. `src/lib/weight.ts`: chart maths as a pure, tested module — `buildSeries`, `filterByRange`, `changeOverRange`.
   *Decision:* the rolling window is measured in **days, not samples**. Weigh-ins are not reliably daily, so a sample-count window would keep averaging stale readings in after a gap. Covered by tests.
3. `Weight.tsx`: log form + list, range selector, change-over-range readout.
4. `WeightTrend.tsx`: Recharts line with raw points plus the 7-day average, and an optional goal line read from `profiles.goal_weight_kg` (added by migration `0004`).

**Verify**
- Log three weights on different dates; the chart shows them and the rolling average is visibly smoothed.
- Log a second entry on an existing date; it **edits**, not duplicates.

**Done when:** an existing date cannot produce two rows.

---

### M4 — Manual calorie logging

**Goal:** a fully working tracker with no AI involved. This is the fallback, so it must be solid.

**Tasks**
1. `src/lib/calories.ts`: day totals, zero-filled daily series, category grouping, target comparison. Pure and tested. The series deliberately includes days with **no** entries — otherwise a bar chart hides the gaps and the x-axis misrepresents the spacing.
2. `useFood.ts`, `useCategories.ts`, and `useProfile.ts` (profile + latest weight → derived target, shared by Today/Calories/Charts).
3. `Calories.tsx`: day view with add/edit/delete (name, grams, kcal, category, note).
4. `CalorieCharts.tsx`: daily kcal vs target (bar + reference line, over-target days in red), 7/30/90 range, kcal-by-category donut, range summary stats.
5. `Today.tsx`: progress ring, today's list, quick add, links out.
6. `Categories.tsx`: manage food and spending categories (add/rename/recolour/delete). Built here because M4's category picker needs somewhere to add them.
7. Entries carry `source: 'manual' | 'ai'`; AI rows are badged even before M5 exists.

**Verify**
- Log a full day; the day total matches the sum of entries.
- The bar for today visibly compares against the target line from M2.
- Delete an entry; totals and charts update.

**Done when:** a day can be logged and charted end-to-end without the agent.

---

### M5 — AI calorie agent ⚠ highest risk

**Goal:** the Korean BBQ test works, with approval gating.

**Tasks**
1. `supabase/functions/ai/index.ts`:
   - Verify the caller's JWT; reject anonymous calls.
   - Read `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` from env.
   - Call OpenRouter at `https://openrouter.ai/api/v1/chat/completions`.
2. **Request shape** (this is the part that must not be improvised):
   ```jsonc
   {
     "model": "<OPENROUTER_MODEL>",
     "messages": [ { "role": "system", "content": "<estimator prompt>" },
                   { "role": "user",   "content": "<user description>" } ],
     "plugins": [ { "id": "web", "max_results": 3 } ],   // search runs once, injects results
     "tools": [ { "type": "function", "function": {
        "name": "propose_food_entries",
        "parameters": {
          "type": "object",
          "properties": {
            "items": { "type": "array", "items": {
              "type": "object",
              "properties": {
                "name": {"type":"string"},
                "grams": {"type":"number"},
                "kcal": {"type":"number"},
                "category": {"type":"string"},
                "confidence": {"enum":["low","medium","high"]},
                "basis": {"enum":["search","estimate"]},
                "source": {"type":["string","null"]}
              },
              "required": ["name","grams","kcal","category","confidence","basis"]
            }},
            "assumptions": { "type":"array", "items": {"type":"string"} },
            "total_kcal": {"type":"number"}
          },
          "required": ["items"]
        }
     }}],
     "tool_choice": { "type":"function", "function": {"name":"propose_food_entries"} }
   }
   ```
   The forced `tool_choice` is how structured output is obtained, because the model does not support `response_format`. See §1.
3. Validate the returned tool arguments with Zod. On failure: write `ai_jobs.status='failed'`, return a typed error, **never** surface partial data.
4. `AiAgent.tsx`: textarea → progress → editable draft table (grams/kcal/category editable, per-row include toggle) → **Approve selected** / **Discard**. Sources and `assumptions` shown above the table. Every AI value badged *estimated*.
5. Approve inserts into `food_entries` with `source:'ai'`, `ai_job_id`; sets job `approved`. Discard writes nothing and sets job `discarded`.
6. Prompt the system message to: prefer per-item rows in grams, assign existing categories, state assumptions, and cite sources when a search informed a number.
7. **Retry logic** per `IMPLEMENTATION_PLAN.md` §9: jittered backoff on transient failures, honour `Retry-After`, one schema-repair retry, fail-fast on permanent errors, and record `attempts`/`last_error` on `ai_jobs`. The chosen model is a free endpoint and is not always successful, so this is required, not optional.

**Verify — the acceptance test for the whole project**
- Input: *"Korean BBQ buffet — grilled bulgogi, short rib, pork belly, kimchi, rice, about 2 hours."*
- Expect: multiple item rows in grams, plausible kcal, categories assigned, total present.
- **No DB write occurs** until *Approve* is pressed — confirm with a fresh `SELECT count(*)` before and after.
- Edit a row's grams; only the edited value is inserted.
- Discard leaves the table count unchanged and the job marked `discarded`.

**Done when:** the acceptance test passes and nothing is persisted pre-approval. **Decision Gate — bring the raw model output to the human to judge quality.**

**Known risk:** OpenRouter free-tier rate limits (HTTP 429). Verify current limits; if they block normal use, switch `OPENROUTER_MODEL` to the paid slug (one-line change, no code edit).

---

### M6 — Spending tracking

**Goal:** log AUD expenses and see where money goes.

**Tasks**
1. `useSpending.ts` (reuse the category pattern from M4).
2. `Spending.tsx`: description, amount, date, category.
3. `SpendingCharts.tsx`: spend over time, category donut, top categories, month-over-month.

**Verify**
- Log a month of expenses across ≥3 categories; the donut totals equal the sum of entries.
- Change one amount; all charts update.

**Done when:** monthly totals reconcile against the raw list.

---

### M7 — Insights agent

**Goal:** written analysis with real tips.

**Tasks**
1. Second function mode (or second function) `kind='insight'`.
2. Build **aggregates**, not raw rows: category totals, monthly sums, weight trend, calorie adherence. (MVP.md §8.5 — smaller payload, better reasoning, less data exposure.)
3. `Insights.tsx`: run on demand, render prose, persist to `ai_jobs`.
4. Explicit prompt constraint: no invented numbers; reference only the supplied aggregates.

**Verify**
- Run on a month with known totals; every figure the prose cites matches the underlying aggregate.
- Run it with empty data; it degrades gracefully rather than erroring.

**Done when:** cited figures reconcile with the aggregates.

---

### M8 — Export, PWA, polish

**Goal:** data is portable and the app installs on the phone.

**Tasks**
1. Full JSON export/import (round-trip) and per-dataset CSV export.
2. PWA: `manifest.webmanifest`, icons, service worker via `vite-plugin-pwa` (cache the shell; **no offline writes**).
3. Accessibility pass: charts paired with numeric summaries, tap targets ≥44px.
4. Security sweep: build and grep `dist/` for the OpenRouter key and any `service_role` string — **expect zero hits**.
5. Confirm public signups remain disabled in Supabase.
6. **Stale-build detection.** Every deploy changes the entry chunk's hash, but a tab left open keeps running the old bundle, and client-side navigation never re-fetches code — so screens can silently show a previous build and look like a broken deploy. Fetch the deployed `index.html` (cache-busted) on window focus and offer a "New version available — reload" prompt.
7. **Form field `name`/`id` attributes.** Surfaced by the live console in M4: autofill and password managers key off them, and this app is mostly used on a phone. Also add a favicon — the console shows a 404 for one.

**Verify**
- Export JSON → clear → re-import → identical counts and totals.
- Install to the phone home screen and launch standalone.
- The `dist/` grep returns nothing.

**Done when:** export round-trips, the app installs, and the grep is clean.

---

## 4. Traps — the things that will bite

| Trap | Symptom | Prevention |
|---|---|---|
| Pages project-site base path | Blank page / 404 on all assets | `base: '/calorie_weight_money_tracker/'` |
| SPA deep links on Pages | Direct URL 404s | `404.html` fallback + verify in M0 |
| Missing RLS | Data readable anonymously | Explicit test in M1 (anonymous write must fail `42501`); re-check before M8 |
| PostgREST schema cache lags | Newly created tables return `404 / PGRST205` straight after a migration | Wait for the cache to refresh, or run `notify pgrst, 'reload schema'`. It is not a migration failure. |
| Open tab keeps running an old build | A screen shows content from an earlier deploy; looks like a broken deploy | Client-side navigation never re-fetches code. Hard reload the tab. Permanent fix is the stale-build detector in M8. |
| Free model lacks `response_format` | 400 or unparseable output | Forced `tool_choice`, never `response_format` |
| Web plugin + forced tool call | Search results ignored, or 400 | Search plugin runs once per request; if it conflicts with `tool_choice`, split into two calls (research, then emit) |
| Free-model rate limits | 429s | Check limits; fall back to paid slug |
| Ignoring `Retry-After` on 429 | Blind retries make rate limiting worse | Honour the header; jittered backoff (see §9) |
| Retrying permanent errors | Burns attempts on 400/401/402 | Fail fast on non-retryable statuses (§9) |
| Edge function CORS | Browser blocks the call | Set CORS headers; handle `OPTIONS` |
| Timezone drift | Late-night entries land on the wrong day | Resolve "today" via `profiles.timezone`, never `new Date()` local |
| Secrets in bundle | Key in `dist/` | Grep `dist/` in M8; key only in function secrets |
| NoSQL-style floats for money | Rounding errors | Store AUD as `numeric(10,2)`; never float arithmetic |

---

## 5. Verification summary

| Milestone | Single most important check |
|---|---|
| M0 | Deep link renders on Pages |
| M1 | Anonymous query returns zero rows; all tables `rowsecurity = true` |
| M2 | Target recomputes live and persists |
| M3 | One row per date, enforced |
| M4 | Day total equals sum of entries |
| M5 | **Nothing persisted before approval**; Korean BBQ test passes |
| M6 | Donut totals equal sum of entries |
| M7 | Prose figures match aggregates |
| M8 | `dist/` grep for secrets is clean; export round-trips |

---

## 6. Suggested commit sequence

```
M0: scaffold + Pages deploy pipeline
M1: supabase schema, RLS, auth
M2: profile + TDEE calculator
M3: weight logging + trend chart
M4: manual calorie logging + charts
M5: AI calorie agent with approval gate
M6: spending tracking + charts
M7: insights agent
M8: export, PWA, security sweep
```

---

## 7. Decision gates — stop and involve the human

1. **After M1** — confirm the RLS checks passed before building features on top.
2. **After M5** — judge AI output quality on the Korean BBQ test; decide free vs paid model.
3. **Before M8** — confirm any scope change since M7.

Everything else has a specified default in `MVP.md`. Do not block on other questions.

---

## 8. Out of scope (do not build)

Multi-user/sharing, offline writes, native apps, bank or CSV transaction import, barcode scanning, macro targets and macro charts, exercise calories, reminders/notifications, dark mode, i18n. See `MVP.md` §13.

---

## 9. AI request resilience (M5, M7)

**Why this exists:** `inclusionai/ling-3.0-flash-fin:free` is a free endpoint. It has imperfect success rates and tighter rate limits than paid ones. Reliability is handled server-side, so the browser makes one call and observes one outcome.

**The property that makes retries trivial:** nothing is written to the database until the user approves. A retry therefore cannot double-insert, so no idempotency keys are needed. Do not write drafts to the database — keeping them in component state is what preserves this.

**Attempt budget:** at most **3 attempts** per user request, **60s timeout per attempt** via `AbortController`.

**Backoff:** 1s, then 3s, each with ±30% jitter. If the response carries `Retry-After`, wait `max(Retry-After, computed backoff)`.

**Retry on:**
- network failure, DNS, connection reset
- timeout (aborted request)
- HTTP `408`, `429`, `500`, `502`, `503`, `504`

**Never retry** (permanent — fail fast with a typed error the UI can explain):
- `400`, `401`, `402`, `403`, `404`, `422`
- `401` = bad/missing key, `402` = out of credits. Both need human action, not another attempt.

**Schema-repair retry** (separate budget, **max 1**):
If the tool-call arguments fail Zod validation, re-send with the previous assistant message plus a user message stating the validation error and instructing a corrected tool call. This does not count against the transient budget and must never loop more than once.

**On exhaustion:**
Set `ai_jobs.status='failed'`, store `attempts` and `last_error`, and return a concise message. The UI shows **Try again** and points at manual entry (which already exists from M4). Never render partial or unvalidated rows.

**Observability:** persist `attempts` and `last_error` on `ai_jobs` so recurring flakiness is visible rather than mysterious.

**Guardrails:** disable the submit button while a request is in flight. Do not auto-retry beyond the budget above.

**Reference implementation:**

```ts
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const backoff = (i: number) =>
  [1000, 3000][i] * (0.7 + Math.random() * 0.6);        // ±30% jitter

async function callOpenRouter(body: unknown, attempts = 3, timeoutMs = 60_000) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                   "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) return await res.json();

      // Permanent: do not retry.
      if (!RETRYABLE.has(res.status)) {
        throw new PermanentError(res.status, await res.text());
      }
      lastError = new TransientError(res.status);
      const retryAfter = Number(res.headers.get("retry-after")) * 1000;
      await sleep(Math.max(retryAfter || 0, backoff(i)));
    } catch (err) {
      if (err instanceof PermanentError) throw err;
      lastError = err;                                     // network / timeout
      if (i < attempts - 1) await sleep(backoff(i));
    }
  }
  throw lastError;
}
```

**Testing note:** simulate `429` with `Retry-After`, a `500`, a network abort, and a malformed tool response; confirm each behaves per the policy above and that `ai_jobs` records the attempts.

