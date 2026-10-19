# ShiftFix – Frontend Guidelines & Requirements (v0.1)

Scope: **frontend only**. The backend contract is `shiftfix-api-schemas.md` / `shiftfix-openapi.yaml` (v0.5). Business context is in `context.md`.
Time box for the whole project is 2 hours, so every requirement has a priority: **M** (must, needed for the demo), **S** (should), **C** (could).

---

## 1. Goals and users

- **Primary user: the manager.** The demo scenario is 07:00 sick report, 09:00 shift start. The manager must reach a confirmed replacement in a few clicks, probably on a phone.
- **Employees do not use this frontend.** They answer offers in Telegram, so there are no employee screens.
- The UI never decides eligibility. It only shows what the backend returns (correctness is a backend guarantee). The UI must make that visible: why someone is a candidate or excluded.

### Assumptions (not in the sketch, please confirm)
1. **"Mark absent" lives on Home, tab 1.** Each on-shift row has **Mark absent**. On success the app goes straight to Replacements for the first id in `openedShiftIds`. The sketch's "find replacement" button on tab 1 is therefore replaced by this flow, because the API only allows replacement search for `open` shifts.
2. **"Find replacement" appears only on `open` shifts** (calendar, and the open-shifts banner on tab 1).
3. UI languages: **NL / FR / EN**, switchable by the manager. Default from the browser, fallback EN.
4. No login screen (the backend has no auth or manager accounts).

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript (strict) | Requested |
| Build | Vite | Fast setup and HMR |
| Styling | Tailwind CSS | Utility classes, minimal design |
| UI primitives | Radix UI (headless) with our own Tailwind wrappers (shadcn/ui style) | Accessible dialogs, tabs, collapsibles without heavy styling |
| Routing | React Router v6 | Simple, URL-driven state |
| Server state | TanStack Query v5 (`useInfiniteQuery` for cursor lists) | Caching, polling, mutations |
| Forms | React Hook Form + Zod | Client validation mirroring backend invariants |
| API types | `openapi-typescript` generated from `shiftfix-openapi.yaml` + a thin `fetch` client | No hand-written DTOs, so no drift |
| i18n | `react-i18next` | NL/FR/EN |
| Dates | `date-fns` + `date-fns-tz` (`Europe/Brussels`) | Small, tree-shakeable |
| Calendar | `@fullcalendar/react` (week and day views) **or** a custom week grid | FullCalendar is faster to ship; custom is lighter. Decide on bundle size |
| Icons | `lucide-react` | Consistent line icons |
| Mocks | MSW using the OpenAPI examples | Frontend works before the backend is ready |
| Tests | Vitest + Testing Library; one Playwright test for the demo flow | Coverage where it matters |

---

## 3. Information architecture

Top bar: logo, nav (**Home**, **Workers**), language switcher. No sidebar.

| Route | Page | Notes |
|---|---|---|
| `/` | Home | `?tab=now` (default) or `?tab=calendar` |
| `/shifts/:shiftId/replacements` | Replacements | Reached from "Find replacement" or after "Mark absent" |
| `/workers` | Workers | `?q=` search, `?open=7` expanded row, both kept in the URL |
| `/workers/:workerId/history` | History | Back link to `/workers?open=:workerId` |

All states that matter (tab, search, expanded worker) live in the URL so links and refresh work.

---

## 4. Functional requirements

### 4.1 Home – Tab 1 "On shift now"  (`GET /shifts/current`)

| ID | Requirement | Pri |
|---|---|---|
| H1-1 | Show the paginated list of workers on shift: name, qualification, "until HH:mm" (from `endsAt`) | M |
| H1-2 | Each row has a **Mark absent** button. It opens a small dialog: type (`sick` / `vacation` / `unavailable`, default `sick`), start (default now), end (default end of today). No free-text reason field (GDPR) | M |
| H1-3 | On submit call `POST /absences`. On success go to `/shifts/:firstOpenedShiftId/replacements`. If `openedShiftIds` is empty, show a toast "no shifts affected" and stay | M |
| H1-4 | **Open-shifts banner** at the top: "N open shifts today – Find replacement". It comes from `GET /shifts` for today, filtered to `status=open` on the client. A single open shift links straight to Replacements, several open the calendar tab for today | S |
| H1-5 | Empty state: "Nobody is on shift right now" | M |
| H1-6 | The list refetches every 30 s and on window focus (covers sick reports sent through the Telegram bot) | S |

### 4.2 Home – Tab 2 "Calendar"  (`GET /shifts?from&to`)

| ID | Requirement | Pri |
|---|---|---|
| H2-1 | Week view by default (Monday start), day view on mobile. Prev / next / today controls | M |
| H2-2 | Each shift is an event labelled "First Last" with its time range. Fetch the visible range only, and follow `nextCursor` until the range is complete | M |
| H2-3 | `scheduled` events use the neutral style, `open` events use an accent style with the label **Open** (no worker name). `cancelled` events are hidden by default | M |
| H2-4 | Clicking an event opens a small popover: worker (or "Open"), date, time. An `open` shift shows a primary **Find replacement** button linking to Replacements. A `scheduled` shift shows no such button (it must be marked absent first) | M |
| H2-5 | Refetch on window focus and every 60 s | C |

### 4.3 Replacements page  (`/shifts/:shiftId/replacements`)

| ID | Requirement | Pri |
|---|---|---|
| R-1 | **Header** from `GET /shifts/:id`: qualification, date, start–end, status badge, and "Absent: name" when known. Back link to Home | M |
| R-2 | **Candidates list** from `GET /shifts/:id/replacements`, in the given order (never re-sorted on the client). Row: name, score (0–100 as a thin bar plus number), offer status badge when `offerStatus` is not `null` | M |
| R-3 | Row action **Contact**: `POST /shifts/:id/offers` with `{ workerIds: [id] }`. Hidden or disabled when an offer is already `pending` or `accepted`. After `declined` or `expired` the button stays available, but the backend may answer `ALREADY_OFFERED`; show the matching message | M |
| R-4 | Page action **Send to top 3**: `POST /shifts/:id/offers` with no body. This is the fast path for the demo | M |
| R-5 | Row action **Show contact info**: fetch `GET /workers/:id/contact-info` only on click. Show a popover with each channel (type, address, preferred marker). Phone numbers use `tel:` links. Not cached longer than the open popover | M |
| R-6 | **Offer polling:** while any offer is `pending`, poll `GET /shifts/:id/offers` (and the candidates list) every 5 s. Stop polling when none is pending or the page is hidden | M |
| R-7 | When an offer is `accepted`: show a success banner "Anna → Jonas Willems", refetch the shift header (now `scheduled`), and switch the page to a read-only "Filled" state. The candidates endpoint then returns `409 SHIFT_NOT_OPEN`, which is handled as this state, not as an error | M |
| R-8 | When a wave ends with no acceptance, the backend starts the next one on its own. Show the wave number in a small status line ("Wave 2 – 3 offers pending") | S |
| R-9 | **Excluded workers**: a collapsed section "Not eligible (N)" from `GET /shifts/:id/exclusions`, loaded on first expand. Each row shows the name and the failed rules as small badges with translated labels (`qualification`, `min_rest`, `max_weekly`, and so on) | M |
| R-10 | Empty candidates: "No eligible workers". `NO_CANDIDATES_LEFT` shows "Everyone eligible has been contacted" | M |
| R-11 | Each offer row shows `sentAt` and `respondedAt` as relative times ("4 min ago") | S |
| R-12 | The backend scores candidates but sends no score breakdown, so no "why this score" UI yet | – |

Offer statuses are shown as badges: `pending` amber, `accepted` green, `declined` red, `expired` gray, `cancelled` gray.

### 4.4 Workers page  (`/workers`)

| ID | Requirement | Pri |
|---|---|---|
| W-1 | Paginated list (`GET /workers`): name, contract type, qualification chips. **Load more** button (cursor API, so no page numbers) | M |
| W-2 | **Search** field. Debounce 300 ms, sent as `search`, kept in the URL as `?q=`. Clearing it restores the full list | M |
| W-3 | Click a row to **expand** it (accordion, one open at a time) and fetch `GET /workers/:id`. Show a skeleton while loading | M |
| W-4 | Expanded view shows all fields: contract type and hours/week, hourly rate (EUR from cents), priority factor, language, external student hours (students only), active flag, qualifications with expiry date, contact channels, worked hours this week (read-only) | M |
| W-5 | **Edit mode** in place: Edit / Save / Cancel. Save sends only changed fields in `PATCH /workers/:id`. On `200` replace the cached worker with the response and update the list row | M |
| W-6 | Edit controls: text inputs for names; selects for contract type and language; number inputs for hours and rate (rate typed in EUR, sent in cents); priority as a 0–3 segmented control; toggle for `isActive`; list editors for qualifications and channels | M |
| W-7 | Client validation (mirrors the backend): `priorityFactor` is an integer 0–3; max one channel per type; at most one preferred channel; no duplicate qualification codes; rate and hours are not negative; `studentHoursExternalYtd` only editable for `student` contracts | M |
| W-8 | Qualification editor: pick from the known qualification list. Since the API has no endpoint for it, derive the options from the loaded workers or keep a constant (see open questions) | S |
| W-9 | Server `422 VALIDATION_ERROR` keeps the form open and shows the error at the top of the form. Edit is not lost | M |
| W-10 | **History** button in the expanded view links to `/workers/:id/history` | M |
| W-11 | Setting `isActive` to false asks for confirmation ("will no longer be suggested as a replacement") | S |
| W-12 | Warn on leaving the page with unsaved edits | C |

### 4.5 History page  (`/workers/:workerId/history`)

| ID | Requirement | Pri |
|---|---|---|
| HI-1 | Header with the worker's name (from `GET /workers/:id`) and a back link | M |
| HI-2 | Timeline of audit entries from `GET /workers/:id/history`, newest first, **Load more** for pagination | M |
| HI-3 | Entry shows: time (`occurredAt`, Brussels time), a translated action label, who did it (`actor`: `manager`, `system`, `bot`, `worker:7` → "Worker #7"), and a link to the shift when `shiftId` is set | M |
| HI-4 | For `worker_updated`, render `changes` as a compact diff: field label, old value, arrow, new value. Format by field: `hourlyRateCents` → "€16.50", dates localized, lists joined | M |
| HI-5 | Icon or color per action family (edit, absence/shift, offer) to make scanning easy | C |
| HI-6 | Empty state: "No history yet" | M |

---

## 5. Cross-cutting functional requirements

| ID | Requirement | Pri |
|---|---|---|
| X-1 | **Pagination:** one reusable `usePagedList` hook over `useInfiniteQuery` and one `LoadMore` component for every list. Disable the button while fetching, hide it when `nextCursor` is `null` | M |
| X-2 | **Error mapping:** a single table maps `error` codes to translated messages (`SHIFT_NOT_OPEN`, `ALREADY_OFFERED`, `NOT_ELIGIBLE`, `NO_CANDIDATES_LEFT`, `CHANNEL_UNAVAILABLE`, `WORKER_NOT_FOUND`, `SHIFT_NOT_FOUND`, `VALIDATION_ERROR`). Unknown code → generic message. Never show raw codes to the user | M |
| X-3 | **Feedback:** mutations show a toast on success and failure. Buttons show a spinner and are disabled while the request runs (prevents double offers) | M |
| X-4 | **Loading and empty states** for every list and detail (skeletons, not spinners, for lists) | M |
| X-5 | **i18n:** all user-facing strings in `nl.json`, `fr.json`, `en.json`. Enum values (rule ids, action names, offer statuses, absence types) are translated, never shown raw. Dates, times and currency use the active locale | M |
| X-6 | **Time handling:** the API sends UTC `YYYY-MM-DDTHH:MMZ`. Display in `Europe/Brussels`, 24-hour clock. Send ranges and absence times back as UTC in the same format | M |
| X-7 | **404 pages** for unknown shift or worker ids, with a link home | S |
| X-8 | **Offline/API-down banner** ("Connection lost – retrying") instead of a blank page | S |

---

## 6. Non-functional requirements

### Performance
- Home loads and is usable in under **2 s** on a mid-range phone with 4G; initial JS under **200 KB gzipped** (lazy-load the calendar and route-split Workers/History).
- List requests use `limit` 20 (calendar 100). No request waterfalls on the Replacements page: header, candidates and offers load in parallel.
- Interactions give visible feedback within **100 ms** (optimistic UI where safe, otherwise spinner).
- Polling is limited to the cases named above, paused when the tab is hidden, and backs off on repeated errors.

### Usability and speed in a real situation
- Mark absent → offers sent takes **at most 4 clicks**: Mark absent, Confirm (opens Replacements), Send to top 3, done.
- The page title and the primary action are always visible without scrolling on a 360 × 640 viewport.
- Touch targets are at least 44 × 44 px.

### Responsiveness
- Mobile-first, from **360 px** up to desktop. Tables become stacked cards on small screens. Calendar defaults to day view below the `md` breakpoint.

### Accessibility (WCAG 2.1 AA)
- Full keyboard use; visible focus ring on all interactive elements; logical tab order.
- Radix primitives for dialogs, tabs, popovers and accordions (focus trap, ESC, ARIA built in).
- Color is never the only signal: statuses and the open-shift style also carry text or an icon. Contrast at least 4.5:1.
- Live region (`aria-live="polite"`) announces offer status changes and toasts.
- Calendar events are reachable and activatable by keyboard.

### Privacy and security (GDPR-minded)
- **Data minimization:** show only what the backend returns for a screen. Sensitive fields (hourly rate, contact info) appear only in the expanded worker view or after an explicit click.
- **No sick-leave reasons or medical details** in any form, label or placeholder.
- **No PII in browser storage.** Query cache stays in memory only (no persisted cache, no `localStorage` for API data). Only the UI language is stored.
- **No PII in logs, analytics, error trackers or URLs.** URLs carry ids and the search term only. No third-party analytics or fonts loaded from external CDNs (self-host fonts).
- Contact info popover clears its data on close.
- Strict CSP headers are expected from hosting; no `dangerouslySetInnerHTML`; render all API strings as text.
- No secrets in the bundle; API base URL via env (`VITE_API_BASE_URL`).

### Reliability
- Every request has error handling and a retry affordance. TanStack Query retries GETs twice; **POST and PATCH are never auto-retried**.
- Mutations are idempotency-safe on the UI side: a second click while pending is ignored.
- Rule and enum values unknown to the UI (a new `ruleId`, say) fall back to a neutral badge showing a generic label, not a crash.

### Maintainability and quality
- TypeScript `strict`, ESLint + Prettier, no `any`. API types generated, never hand-copied.
- Feature-based folders, small components, no business rules in the UI (see section 8).
- Tests: unit tests for formatters, validators and error mapping; component tests for the Replacements and Workers flows; one end-to-end test of the demo scenario against MSW.

### Compatibility
- Latest two versions of Chrome, Safari, Firefox and Edge; iOS Safari and Android Chrome.

---

## 7. Design guidelines

**Principles:** minimal, calm, fast to scan. Borders and whitespace instead of shadows and decoration. One accent color. Information first.

### Tokens (Tailwind)

| Token | Value |
|---|---|
| Font | Inter (self-hosted), system fallback. Base 14 px/20, titles 20–24 px semibold |
| Neutrals | `slate` scale: page `slate-50`, surface `white`, border `slate-200`, text `slate-900`, muted text `slate-500` |
| Accent | `indigo-600` (hover `indigo-700`) for primary actions and focus rings |
| Success / warning / danger | `emerald` / `amber` / `red`, used only for status badges and alerts, in the `-50` bg + `-700` text pairing |
| Radius | `rounded-md` for controls, `rounded-lg` for cards and dialogs |
| Shadow | none by default; `shadow-sm` only on popovers and dialogs |
| Spacing | 4-px scale; page padding `px-4 md:px-6`, content max width `max-w-5xl`, vertical rhythm `space-y-4` |
| Motion | 150 ms fades and height transitions only; respect `prefers-reduced-motion` |

### Component library (`components/ui`, shadcn/Tailwind style)
`Button` (primary / secondary / ghost / danger, sizes sm and md, `loading` prop), `Badge` (neutral / success / warning / danger), `Card`, `Tabs`, `Dialog`, `Popover`, `Accordion`/`Collapsible`, `Input`, `Select`, `SegmentedControl`, `Switch`, `Skeleton`, `Toast`, `EmptyState`, `ErrorState`, `LoadMore`, `ScoreBar`, `Avatar` (initials only, no photos).

Shared domain components: `ShiftTime`, `WorkerName`, `OfferStatusBadge`, `RuleBadge`, `QualificationChips`, `ContactInfoPopover`, `ChangeDiff`.

### Layout patterns
- **Lists:** a stack of bordered rows (`divide-y`), name left, secondary info muted, actions right. On mobile the actions move under the text.
- **Primary action per screen** is the only filled indigo button: Mark absent (secondary until chosen), Send to top 3, Save.
- **Status** is shown with small rounded badges, never with full-row colors.
- **Destructive or irreversible actions** (sending offers, deactivating a worker) are explicit and say what will happen.

### Tone and copy
- Short, direct labels ("Find replacement", "Send to top 3", "Show contact info").
- Reasons for exclusion are plain language ("Not enough rest since last shift"), not rule ids.

---

## 8. Code guidelines

### Folder structure
```
src/
  app/            router, providers (QueryClient, i18n), layout
  api/            generated types, fetch client, error mapping
  features/
    home/         NowList, Calendar, OpenShiftsBanner, MarkAbsentDialog
    replacements/ Header, CandidateList, ExclusionList, OfferStatus
    workers/      WorkerList, WorkerRow, WorkerForm, schemas.ts
    history/      HistoryTimeline, ChangeDiff
  components/ui/  design-system primitives
  lib/            dates, money, usePagedList, polling helpers
  i18n/           nl.json, fr.json, en.json
  mocks/          MSW handlers from OpenAPI examples
```

### Rules
1. **The backend is the single source of truth for rules.** The UI never filters, ranks or validates eligibility. It renders candidates and exclusions exactly as returned. Client validation covers only form-level invariants listed in W-7.
2. **Data layer:** one `useXxx` hook per endpoint in `features/*/api.ts`. Components never call `fetch` directly. Query keys are centralised.
3. **Cache updates:** after `PATCH /workers/:id`, write the response into the `['worker', id]` cache and invalidate the `['workers']` list. After offers are sent, invalidate offers and candidates. After `POST /absences`, invalidate `['shifts']`.
4. **Money and time helpers** live in `lib/`: `centsToEur`, `eurToCents`, `formatBrussels(utcString)`, `toApiUtc(date)`. No inline conversions in components.
5. **Enums** come from the generated types. UI labels are looked up from i18n by enum value via typed helpers.
6. **Forms:** Zod schema per form; the Workers form sends only changed fields (diff against the loaded worker); list fields (`qualifications`, `contactChannels`) are sent whole, because the API replaces them.
7. **State:** server state in TanStack Query, URL state in the router, local UI state in components. No global store.
8. **Naming:** components `PascalCase.tsx`, hooks `useCamelCase.ts`, one component per file, props typed explicitly.

---

## 9. Build order for the 2-hour time box

1. **Setup (10 min):** Vite, Tailwind, router, query client, generated types, MSW with the example data, i18n skeleton.
2. **UI kit + layout (15 min):** Button, Badge, Card, Tabs, Dialog, Skeleton, Toast, top bar.
3. **Home tab 1 + Mark absent (15 min)** → **Replacements page (30 min):** header, candidates, Send offers, polling, filled state, exclusions.
4. **Calendar tab (15 min).**
5. **Workers + edit (20 min)** → **History (10 min).**
6. **Polish (5 min):** NL/FR/EN strings for the demo screens, empty and error states, rehearse the demo flow.

If time runs out, drop in this order: W-12, H2-5, HI-5, W-8, H1-4, R-11.

---

## 10. Open questions and API gaps noticed

1. **Mark absent placement** (assumption 1): confirm the button on tab 1 and the redirect to Replacements.
2. **Open shifts happening now are not in tab 1** (`/shifts/current` returns `scheduled` only). The banner in H1-4 covers this on the client. A `status=open` filter on `GET /shifts` would make it cheaper.
3. **Qualification options for the Workers form:** there is no `GET /qualifications`. Proposal: add one (`code`, `name`), otherwise W-8 uses a hard-coded list.
4. **Offer rows carry only `workerId`**, not names. The offers panel joins them with the candidates list; after acceptance the name comes from the shift header. Adding `firstName`/`lastName` to the offers response would remove this join.
5. **Cancel absence / un-open a shift** has no endpoint. Mistaken "Mark absent" clicks therefore need a clear confirmation dialog (H1-2 shows the affected time range).
6. **Worker names in history:** `actor` is `worker:<id>`, shown as "Worker #7". Fine for now.
7. **Contact when no preferred channel exists:** the backend can answer `CHANNEL_UNAVAILABLE`; the UI offers "Show contact info" so the manager can call instead.
8. **Real-time:** polling is enough for the demo. A WebSocket or SSE would only be needed for larger deployments.
