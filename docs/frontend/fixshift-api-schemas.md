# FixShift – Backend API (v0.3, minimal)

Expected inteface from the frontend point of view.

Base: `/api/v1` · JSON · timestamps ISO 8601 UTC · IDs are strings.
Principle: lists return only what a row needs; anything extra is fetched by a separate call.
Errors (all endpoints): `{ "error": "SHIFT_NOT_FOUND" }` with a matching HTTP status.

**Pagination (all list endpoints):** query `?limit=20&cursor=abc` (limit default 20, max 100).
Response shape: `{ "items": [...], "nextCursor": "abc" }` — `nextCursor` is `null` on the last page.

---

## Home page

### Tab 1: who is on shift now

`GET /shifts/current?limit=20&cursor=abc`

```json
{
  "items": [
    { "shiftId": "sh_101", "workerId": "w_1", "name": "Anna Peeters", "role": "Barista", "endsAt": "2026-10-19T16:00:00Z" }
  ],
  "nextCursor": null
}
```

### Tab 2: calendar

`GET /shifts?from=2026-10-01T00:00:00Z&to=2026-10-31T23:59:59Z&limit=100&cursor=abc`

```json
{
  "items": [
    { "shiftId": "sh_101", "name": "Anna Peeters", "startsAt": "2026-10-19T08:00:00Z", "endsAt": "2026-10-19T16:00:00Z" }
  ],
  "nextCursor": null
}
```

(Calendar only needs a label and time. The "find replacement" button only needs `shiftId`.)

---

## Replacements page

### Shift header

`GET /shifts/sh_101`

```json
{
  "shiftId": "sh_101",
  "name": "Anna Peeters",
  "role": "Barista",
  "startsAt": "2026-10-19T08:00:00Z",
  "endsAt": "2026-10-19T16:00:00Z"
}
```

### Ranked candidates

`GET /shifts/sh_101/replacements?limit=20&cursor=abc`

Sorted by relevance, best first. Score is a plain number; the metrics behind it are not sent.

```json
{
  "items": [
    { "workerId": "w_7", "name": "Jonas Willems", "role": "Barista", "score": 87, "contact": "none" },
    { "workerId": "w_3", "name": "Mila Claes", "role": "Barista", "score": 74, "contact": "sent" }
  ],
  "nextCursor": null
}
```

`contact`: `none` | `sent` | `accepted` | `declined` | `no_response`

### "Contact" button

`POST /shifts/sh_101/replacements/w_7/contact`

Request (body optional; omit to use the worker's preferred channel and the default message):
```json
{ "channel": "whatsapp" }
```

Response `201`:
```json
{ "contact": "sent" }
```

Errors: `404 SHIFT_NOT_FOUND`, `404 WORKER_NOT_FOUND`, `409 ALREADY_CONTACTED`, `422 CHANNEL_UNAVAILABLE`.

### "Show contact info" button

`GET /workers/w_7/contact-info`

```json
{
  "phone": "+32 470 12 34 56",
  "email": "jonas@example.com",
  "channels": ["whatsapp", "sms"]
}
```

### Refresh statuses (optional, for polling after contacting)

`GET /shifts/sh_101/contacts?limit=100&cursor=abc`

```json
{
  "items": [
    { "workerId": "w_7", "contact": "accepted" },
    { "workerId": "w_3", "contact": "sent" }
  ],
  "nextCursor": null
}
```

---

## Workers page

### List + search

`GET /workers?search=jon&limit=20&cursor=abc`

`search` matches by name (case-insensitive, partial). Omit it for the full list.

```json
{
  "items": [
    { "workerId": "w_7", "name": "Jonas Willems", "role": "Barista" }
  ],
  "nextCursor": "abc"
}
```

### Expand an entry: worker details

`GET /workers/w_7`

Fetched only when a row is expanded.

```json
{
  "workerId": "w_7",
  "name": "Jonas Willems",
  "role": "Barista",
  "qualifications": ["Espresso machine", "First aid"],
  "salary": 2400,
  "priority": 0.8,
  "normalWorkHours": 32,
  "completedHours": 22,
  "phone": "+32 470 12 34 56",
  "email": "jonas@example.com",
  "channels": ["whatsapp", "sms"],
  "version": 4
}
```

- `priority`: 0–1, higher = more likely to be picked / to respond.
- `completedHours` and `version` are read-only (computed / managed by the backend).

### Edit worker

`PATCH /workers/w_7`

Send only the fields that changed. Every successful edit creates a new stored version.

Editable: `name`, `role`, `qualifications`, `salary`, `priority`, `normalWorkHours`, `phone`, `email`, `channels`.

Request:
```json
{ "salary": 2600, "priority": 0.9 }
```

Response `200`:
```json
{ "version": 5 }
```

Errors: `404 WORKER_NOT_FOUND`, `422 VALIDATION_ERROR`.

---

## History page

"History" button on a worker goes to this page, which uses the worker's id.

### List of edits (newest first)

`GET /workers/w_7/history?limit=20&cursor=abc`

Each entry lists only the fields that changed in that version.

```json
{
  "items": [
    {
      "version": 5,
      "editedAt": "2026-10-19T09:12:00Z",
      "editedBy": "Maria Dubois",
      "changes": [
        { "field": "salary", "from": 2400, "to": 2600 },
        { "field": "priority", "from": 0.8, "to": 0.9 }
      ]
    }
  ],
  "nextCursor": "abc"
}
```

Errors: `404 WORKER_NOT_FOUND`.

---

## Deliberately not exposed (yet)

- Create / delete worker: not described in the sketch.
- Full snapshot of a past version (`GET /workers/{id}/history/{version}`): add if the History page should show or restore an entire old state, not just diffs.
- Score breakdown: add `GET /shifts/{id}/replacements/{workerId}/score` once the metrics are defined.
- Confirm/assign replacement: needed once you describe that flow.
- The third bullet of the History page in your message was empty. Tell me what it was meant to contain.
