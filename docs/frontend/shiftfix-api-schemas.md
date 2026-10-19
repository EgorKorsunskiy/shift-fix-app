# ShiftFix – Backend API (v0.5, minimal)

The interface the backend exposes to the frontend. The data model behind it is in [`../backend/domain.md`](../backend/domain.md). Field meanings and enum values here follow that document. The full spec is in [`shiftfix-openapi.yaml`](shiftfix-openapi.yaml).

**Basics**
- Base URL: `/api/v1`. JSON. IDs are integers.
- Timestamps are UTC with minute precision, `YYYY-MM-DDTHH:MMZ` (e.g. `2026-10-20T07:00Z`), the same format the backend stores. Dates are `YYYY-MM-DD`.
- Principle: lists return only what a row needs. Anything extra is fetched by a separate call.

**Errors (all endpoints):** `{ "error": "SHIFT_NOT_FOUND" }` with a matching HTTP status. `422 VALIDATION_ERROR` means a value breaks an invariant from `domain.md`, for example `priorityFactor` outside 0–3.

**Pagination (all list endpoints):** query `?limit=20&cursor=abc` (limit default 20, max 100).
Response shape: `{ "items": [...], "nextCursor": "abc" }`. `nextCursor` is `null` on the last page.

## Shared shapes

**Objects**
- `QualificationRef`: `{ "code": "barista", "name": "Barista" }`. Roles and qualifications are one entity in the backend, and a worker can hold several.
- `ContactChannel`: `{ "type": "telegram", "address": "123456789", "isPreferred": true }`. At most one channel per type, and at most one preferred channel per worker.

**Enums** (values exactly as in `domain.md`)

| enum | values |
|---|---|
| `contractType` | `full_time`, `part_time`, `student` |
| `language` | `nl`, `fr`, `en` |
| `channelType` | `telegram`, `sms`, `whatsapp`, `email`, `phone` |
| `shiftStatus` | `scheduled`, `open`, `cancelled` |
| `absenceType` | `sick`, `vacation`, `unavailable` |
| `offerStatus` | `pending`, `accepted`, `declined`, `expired`, `cancelled` |
| `ruleId` | `qualification`, `availability`, `no_overlap`, `min_rest`, `max_daily`, `max_weekly`, `student_quota` |

---

## Home page

### Tab 1: who is on shift now

`GET /shifts/current?limit=20&cursor=abc`

Returns `scheduled` shifts where `startsAt ≤ now < endsAt`, according to the schedule.

```json
{
  "items": [
    { "shiftId": 101, "workerId": 1, "firstName": "Anna", "lastName": "Peeters",
      "qualification": { "code": "barista", "name": "Barista" }, "endsAt": "2026-10-19T16:00Z" }
  ],
  "nextCursor": null
}
```

### Tab 2: calendar

`GET /shifts?from=2026-10-01T00:00Z&to=2026-11-01T00:00Z&limit=100&cursor=abc`

Returns the shifts that overlap `[from, to)`. An `open` shift has no worker, so its `workerId`, `firstName` and `lastName` are `null`.

```json
{
  "items": [
    { "shiftId": 101, "status": "scheduled", "workerId": 1, "firstName": "Anna", "lastName": "Peeters",
      "startsAt": "2026-10-19T08:00Z", "endsAt": "2026-10-19T16:00Z" },
    { "shiftId": 102, "status": "open", "workerId": null, "firstName": null, "lastName": null,
      "startsAt": "2026-10-20T07:00Z", "endsAt": "2026-10-20T15:00Z" }
  ],
  "nextCursor": null
}
```

The "find replacement" button only makes sense for `open` shifts. It only needs `shiftId`.

---

## Absences

### "Mark absent" button

`POST /absences`

Request:
```json
{ "workerId": 1, "type": "sick", "startsAt": "2026-10-20T05:00Z", "endsAt": "2026-10-20T22:00Z" }
```

Response `201`:
```json
{ "absenceId": 12, "openedShiftIds": [102] }
```

- The worker's `scheduled` shifts that overlap the absence become `open`.
- No reason or diagnosis is accepted (GDPR).
- A sick report sent to the Telegram bot goes through the same logic.

Errors: `404 WORKER_NOT_FOUND`, `422 VALIDATION_ERROR`.

---

## Replacements page

### Shift header

`GET /shifts/102`

```json
{
  "shiftId": 102,
  "status": "open",
  "workerId": null,
  "firstName": null,
  "lastName": null,
  "qualification": { "code": "barista", "name": "Barista" },
  "startsAt": "2026-10-20T07:00Z",
  "endsAt": "2026-10-20T15:00Z"
}
```

Errors: `404 SHIFT_NOT_FOUND`.

### Ranked candidates

`GET /shifts/102/replacements?limit=20&cursor=abc`

- Only workers who pass **every** hard rule (see `domain.md` → Hard rules) are returned, best first.
- `score` is 0–100. The metrics behind it are not sent.
- `offerStatus` is `null` while the worker has not been offered this shift.

```json
{
  "items": [
    { "workerId": 7, "firstName": "Jonas", "lastName": "Willems", "score": 87, "offerStatus": null },
    { "workerId": 3, "firstName": "Mila", "lastName": "Claes", "score": 74, "offerStatus": "pending" }
  ],
  "nextCursor": null
}
```

Errors: `404 SHIFT_NOT_FOUND`, `409 SHIFT_NOT_OPEN`.

### Excluded workers (why someone is not a candidate)

`GET /shifts/102/exclusions?limit=50&cursor=abc`

Active workers who fail at least one hard rule, together with the rules they fail.

```json
{
  "items": [
    { "workerId": 9, "firstName": "Lotte", "lastName": "Janssens", "failedRules": ["min_rest"] },
    { "workerId": 4, "firstName": "Tom", "lastName": "Dubois", "failedRules": ["qualification", "max_weekly"] }
  ],
  "nextCursor": null
}
```

Errors: `404 SHIFT_NOT_FOUND`, `409 SHIFT_NOT_OPEN`.

### "Send offers" button

`POST /shifts/102/offers`

The body is optional:
```json
{ "workerIds": [7] }
```

- **Without a body,** the backend sends the next wave: the top 3 ranked candidates who have not been offered this shift yet.
- **With `workerIds`,** exactly those workers form the next wave. Each one must be a current candidate.
- Each offer goes through the worker's preferred contact channel, in the worker's language.
- When every offer in a wave is declined or has expired, the backend starts the next wave on its own.

Response `201`:
```json
{ "wave": 1, "offers": [ { "offerId": 31, "workerId": 7, "status": "pending" } ] }
```

Errors:
- `404 SHIFT_NOT_FOUND`, `404 WORKER_NOT_FOUND`
- `409 SHIFT_NOT_OPEN`, `409 ALREADY_OFFERED`
- `422 NOT_ELIGIBLE`, `422 NO_CANDIDATES_LEFT`, `422 CHANNEL_UNAVAILABLE`

### Offer statuses (poll after sending)

`GET /shifts/102/offers?limit=100&cursor=abc`

```json
{
  "items": [
    { "offerId": 31, "workerId": 7, "wave": 1, "status": "accepted",
      "sentAt": "2026-10-20T07:05Z", "respondedAt": "2026-10-20T07:09Z" },
    { "offerId": 32, "workerId": 3, "wave": 1, "status": "cancelled",
      "sentAt": "2026-10-20T07:05Z", "respondedAt": null }
  ],
  "nextCursor": null
}
```

Workers answer in Telegram. **There is no confirm call.** When a worker accepts, the backend re-checks every rule and assigns them in one transaction. The shift becomes `scheduled` with the new worker, and the other `pending` offers become `cancelled`. Poll this list or `GET /shifts/{id}` to see the result.

Errors: `404 SHIFT_NOT_FOUND`.

### "Show contact info" button

`GET /workers/7/contact-info`

```json
{
  "channels": [
    { "type": "telegram", "address": "123456789", "isPreferred": true },
    { "type": "phone", "address": "+32470123456", "isPreferred": false }
  ]
}
```

Errors: `404 WORKER_NOT_FOUND`.

---

## Workers page

### List + search

`GET /workers?search=jon&limit=20&cursor=abc`

Returns active workers only. `search` matches the first or last name, case-insensitive and partial. Omit it for the full list.

```json
{
  "items": [
    { "workerId": 7, "firstName": "Jonas", "lastName": "Willems", "contractType": "part_time",
      "qualifications": [ { "code": "barista", "name": "Barista" } ] }
  ],
  "nextCursor": "abc"
}
```

### Expand an entry: worker details

`GET /workers/7`

Fetched only when a row is expanded.

```json
{
  "workerId": 7,
  "firstName": "Jonas",
  "lastName": "Willems",
  "contractType": "part_time",
  "contractHoursPerWeek": 32,
  "hourlyRateCents": 1650,
  "priorityFactor": 2,
  "language": "nl",
  "studentHoursExternalYtd": 0,
  "isActive": true,
  "qualifications": [
    { "code": "barista", "name": "Barista", "validUntil": null },
    { "code": "first_aid", "name": "First aid", "validUntil": "2027-03-31" }
  ],
  "contactChannels": [
    { "type": "telegram", "address": "123456789", "isPreferred": true }
  ],
  "workedHoursThisWeek": 22
}
```

- `hourlyRateCents`: EUR gross per hour, in cents.
- `priorityFactor`: an integer 0–3. It is used only to rank replacement candidates and never filters anyone out.
- `studentHoursExternalYtd`: students only, 0 for everyone else. These are the hours already used this year at other employers.
- `qualifications[].validUntil`: the certificate expiry date. `null` means it never expires.
- `workedHoursThisWeek`: read-only. It comes from actual time entries in the current ISO week (Europe/Brussels).

Errors: `404 WORKER_NOT_FOUND`.

### Edit worker

`PATCH /workers/7`

Send only the fields that change.

Editable fields:
- `firstName`, `lastName`
- `contractType`, `contractHoursPerWeek`, `hourlyRateCents`, `priorityFactor`
- `language`, `studentHoursExternalYtd`, `isActive`
- `qualifications`: the full list of `{ code, validUntil }`
- `contactChannels`: the full list

A list you send replaces the stored list.

Request:
```json
{ "hourlyRateCents": 1750, "priorityFactor": 3 }
```

Response `200`: the updated worker, in the same shape as `GET /workers/{id}`.

Every successful edit is written to the worker's history.

Errors: `404 WORKER_NOT_FOUND`, `422 VALIDATION_ERROR`, e.g. `priorityFactor` outside 0–3, an unknown qualification code, two channels of the same type, or more than one preferred channel.

---

## History page

The "History" button on a worker opens this page, which uses the worker's id.

### Worker history (newest first)

`GET /workers/7/history?limit=20&cursor=abc`

Returns the worker's entries from the audit log. `changes` is set only on `worker_updated` entries, and lists only the fields that changed. There are no manager accounts, so every manager action has `actor: "manager"`.

```json
{
  "items": [
    {
      "occurredAt": "2026-10-19T09:12Z",
      "actor": "manager",
      "action": "worker_updated",
      "shiftId": null,
      "changes": [
        { "field": "hourlyRateCents", "from": 1650, "to": 1750 },
        { "field": "priorityFactor", "from": 2, "to": 3 }
      ]
    },
    {
      "occurredAt": "2026-10-19T07:09Z",
      "actor": "worker:7",
      "action": "offer_accepted",
      "shiftId": 102,
      "changes": null
    }
  ],
  "nextCursor": "abc"
}
```

- `action`: `absence_reported`, `shift_opened`, `offer_sent`, `offer_declined`, `offer_accepted`, `shift_assigned`, `assignment_rejected`, `worker_updated`.
- `actor`: `system`, `manager`, `bot` or `worker:<id>`.

Errors: `404 WORKER_NOT_FOUND`.

---

## Deliberately not exposed (yet)

- **Create / delete worker.** Workers are never deleted. Set `isActive: false` instead.
- **Score breakdown.** Add `GET /shifts/{id}/replacements/{workerId}/score` once the metrics are defined.
- **Worker preferences and time entries.** For now these come from seed data only.
- **Manager accounts and auth.** These are not modelled (see `domain.md`).
