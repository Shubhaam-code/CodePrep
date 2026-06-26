# Convert History page backend from GV Challenge → Company submissions

## Context

The History page (`frontend/src/pages/dashboard/History.jsx`) currently fetches
`GET /api/gvchallenge/progress` to render its activity feed. The user wants
the History page to show **company submission history** instead — the goal
of this task is to add a backend endpoint that returns company-only
submissions in the exact shape the History UI will consume, while leaving
the UI untouched.

Only backend files are modified. The History page's URL swap is deferred
to a follow-up UI change.

## Data sources

Each user solve is recorded in **two** places:

1. `User.solvedQuestions[]` — `{ questionId, syncContext, solvedAt }`. The
   `syncContext` token identifies which learning surface the solve belongs
   to. Company solves are tagged `company_<companyName>` (extension-side
   `getSyncContext` at `extension/content.js:163`, `extension/popup.js:33`,
   `extension/background.js:240`).
2. `Submission` — `{ userId, questionId, code, language, company,
   submittedAt }`. Created by `submissionService.saveSubmissionAndPush`
   (`backend/src/services/submissionService.js:51-59`) for every solve.

The History feed's source of truth is `User.solvedQuestions` because that's
what carries the `syncContext` tag — without it we can't distinguish
company solves from GV / pattern / sheet / general solves.

## Filter rules (per spec)

For a solvedQuestion entry, treat it as a **company** submission **iff**
its `syncContext` starts with `company_`. Exclude any entry whose
`syncContext` starts with `gv_`, `pattern_`, `roadmap_`, `general`, or is
missing.

The `company` value is derived by stripping the `company_` prefix from
`syncContext`.

## Response shape (per spec)

Sort newest first. Return one record per solvedQuestion entry that passes
the filter, with these fields:

```js
{
  questionTitle:  string,        // from Question
  company:        string,        // from syncContext (e.g. "google")
  difficulty:     string,        // from Question (Easy / Medium / Hard)
  language:       string,        // from latest Submission for userId+questionId
  solvedAt:       ISO string,    // from user.solvedQuestions[i].solvedAt
  githubSynced:   boolean,       // true iff a Submission exists (push attempted)
  githubUrl:      string|null,   // https://github.com/<user>/<repo>/blob/main/<path>
  leetcodeUrl:    string|null,   // from Question.leetcodeUrl
}
```

## API design

`GET /api/submissions/history/company`

- Auth: required (`authMiddleware`).
- No query params.
- Returns: `{ submissions: [...] }`.

### Implementation

1. Load user (id from `req.user.id`), also reading `githubUsername`.
2. Populate `solvedQuestions.questionId` in one round-trip so we get
   title / difficulty / leetcodeUrl without N+1.
3. Filter the in-memory array:
   ```js
   const companyEntries = user.solvedQuestions.filter(sq => {
     const ctx = sq.syncContext || 'general';
     return ctx.startsWith('company_') &&
            !ctx.startsWith('gv_') &&
            !ctx.startsWith('pattern_') &&
            !ctx.startsWith('roadmap_') &&
            ctx !== 'general';
   });
   ```
4. Extract `questionId`s and `userId`, then **one** `Submission.find`
   scoped to those ids, sorted newest first, to pick up `language` and
   `company`. Build a `Map<questionIdString, latestSubmission>` for O(1)
   lookup.
5. For each company entry, build the response row:
   - `questionTitle`, `difficulty`, `leetcodeUrl` from the populated
     question (skip the row if the question was deleted).
   - `company` = `syncContext.slice('company_'.length)`.
   - `language` = `latestSubmission?.language ?? ''`.
   - `githubSynced` = `!!latestSubmission` (the `Submission` document is
     only created after the push attempt succeeds-or-fails within
     `saveSubmissionAndPush`; absence means no submission happened).
   - `solvedAt` = `solvedAt.toISOString()` (fall back to `now` if missing).
   - `githubUrl` = if `user.githubUsername` is set, build:
     `https://github.com/<user>/company-preparation/blob/main/<Company>/<Title>.<ext>`,
     using the language → extension map that already lives in
     `submissionService.js:191-214`. URL-encode each path segment.
     `null` when `githubUsername` is missing.
6. Sort by `solvedAt` descending.
7. Return `{ submissions }`.

### Performance / "keep API optimized"

- **One** user fetch with `populate('solvedQuestions.questionId')` — no
  per-question `Question.findById`.
- **One** `Submission.find({ userId, questionId: { $in: [...] } })` — no
  N+1 against `Submission`.
- Filter happens server-side after the populate; this is cheap because
  `solvedQuestions` is per-user and bounded.
- Add an index hint: rely on existing `userId` index on `Submission`
  (already present in `backend/src/models/Submission.js:9`). For the
  `solvedQuestions` array we add a multikey index on
  `solvedQuestions.syncContext` to keep future filters cheap.

## Files to modify

1. **`backend/src/routes/submissions.js`** — add
   `router.get('/history/company', authMiddleware, ...)` that calls a new
   controller method.
2. **`backend/src/controllers/submissionController.js`** — add
   `getCompanyHistory` exporting the controller method that runs the
   query above and shapes the response.
3. **`backend/src/models/User.js`** — add
   `UserSchema.index({ 'solvedQuestions.syncContext': 1 })` so the
   `company_` filter stays cheap as the array grows. (Pure index add —
   no behavioural change.)

No changes to `submissionService.js`, `Submission.js` model, GV routes,
extension routes, frontend, or any other file.

## Verification

Manual end-to-end (no UI change required, can hit the endpoint with
`curl` once the backend is running):

1. `cd backend && npm start`
2. Login → grab JWT.
3. `curl -H "Authorization: Bearer <jwt>" http://localhost:5000/api/submissions/history/company`
4. Expected: array contains **only** entries whose `syncContext` starts
   with `company_`. Entries from GV (`gv_dayN`), pattern
   (`pattern_<slug>`), roadmap, and general are absent.
5. Order is newest first.
6. Each row exposes all 8 fields; `githubUrl` is `null` if the user has
   not connected GitHub.
7. Push a known GV solve (via extension on a GV day) — confirm it does
   **not** appear in the response.
8. Push a known company solve (via extension on a company page) — confirm
   it appears with the correct `company` derived from `syncContext`.