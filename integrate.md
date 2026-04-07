# AlgoForge Judge + Leaderboard Integration Guide (CodePrix)

This guide explains how to wire your **separate AlgoForge judge + leaderboard services** into your existing frontend flow, including:

- taking proper input from UI
- sending code to judge
- showing valid output/errors
- submitting full solutions
- updating contest leaderboards

---

## 1) Current integration points already in this repo

Backend + frontend are already mostly wired:

- Judge adapter: [`judgeClient.callJudge`](server/services/judgeClient.js), [`judgeClient.executeSingleTestCase`](server/services/judgeClient.js), [`judgeClient.executeFullSubmission`](server/services/judgeClient.js), [`judgeClient.addJobToQueue`](server/services/judgeClient.js), [`judgeClient.judgePool.run`](server/services/judgeClient.js) in [server/services/judgeClient.js](server/services/judgeClient.js)
- Submission APIs: [`submissionController.createSubmission`](server/controllers/submissionController.js), [`submissionController.runSubmission`](server/controllers/submissionController.js) in [server/controllers/submissionController.js](server/controllers/submissionController.js)
- Submission routes: [server/routes/submissionRoutes.js](server/routes/submissionRoutes.js)
- Leaderboard compute + push: [`leaderboardController.computeLeaderboard`](server/controllers/leaderboardController.js) in [server/controllers/leaderboardController.js](server/controllers/leaderboardController.js)
- Leaderboard proxy routes: [server/routes/leaderboardProxyRoutes.js](server/routes/leaderboardProxyRoutes.js)
- Frontend submit flow: [client/apex-code-arena/src/pages/ProblemDetail.tsx](client/apex-code-arena/src/pages/ProblemDetail.tsx), [client/apex-code-arena/src/pages/Contests.tsx](client/apex-code-arena/src/pages/Contests.tsx)
- Frontend leaderboard page: [client/apex-code-arena/src/pages/Leaderboard.tsx](client/apex-code-arena/src/pages/Leaderboard.tsx)

---

## 2) Environment setup

Configure main server env (or verify):

File: [server/.env.example](server/.env.example)

Required values:
- `JUDGE_URL=http://localhost:3000` (your AlgoForge Judge)
- `LEADERBOARD_URL=http://localhost:5001` (your AlgoForge Leaderboard)
- `MONGO_URI`, `JWT_SECRET`, `PORT` etc.

Judge startup reference: [server/JUDGE_SETUP.md](server/JUDGE_SETUP.md)

---

## 3) Start all services in order

### A) AlgoForge Judge
From [judge-main/server.js](judge-main/server.js):
- Exposes `POST /execute`
- Input: `code`, `language`, `input`, `timeLimit`, `memoryLimit`
- Output:
  - success: `{ success: true, output, timeTaken, status }`
  - failure: `{ success: false, error, message, details }`

Run:
1. `cd judge-main`
2. `npm install`
3. `node server.js` (or `npm run dev`)

### B) AlgoForge Leaderboard
From [leaderboard-main/index.js](leaderboard-main/index.js):
- Exposes:
  - `POST /update-leaderboard`
  - `POST /get-leaderboard`

Run:
1. `cd leaderboard-main`
2. `npm install`
3. configure `.env` (`MONGO_URL`, `PORT`)
4. `npm start`

### C) Main API gateway
Run:
1. `cd server`
2. `npm install`
3. `npm start`

### D) Frontend
Run:
1. `cd client/apex-code-arena`
2. `npm install`
3. `npm run dev`

---

## 4) End-to-end flow (Submit)

## UI → API
Frontend submits Base64 code:
- [client/apex-code-arena/src/pages/ProblemDetail.tsx](client/apex-code-arena/src/pages/ProblemDetail.tsx)
- [client/apex-code-arena/src/pages/Contests.tsx](client/apex-code-arena/src/pages/Contests.tsx)

Payload to `POST /submissions`:
- `code` (Base64)
- `problemId`
- `language` (`cpp`, `python`, `java`, etc.)
- optional `contestId`

## API → Judge
[`submissionController.createSubmission`](server/controllers/submissionController.js) decodes and dispatches through [`judgeClient.addJobToQueue`](server/services/judgeClient.js), which uses [`judgeClient.executeFullSubmission`](server/services/judgeClient.js) and calls judge for each testcase.

## Verdict persistence
Submission status/logs stored via [server/controllers/submissionController.js](server/controllers/submissionController.js):
- `status` (`AC`, `WA`, `CE`, `RE`, `TLE`, `MLE`, `IE`)
- `metrics.time`
- `metrics.memory`
- `failedTestCase`
- `logs.stdout`, `logs.stderr`

## UI status polling
Frontend polls and updates result UI via hook usage in:
- [client/apex-code-arena/src/pages/ProblemDetail.tsx](client/apex-code-arena/src/pages/ProblemDetail.tsx)
- [client/apex-code-arena/src/pages/Contests.tsx](client/apex-code-arena/src/pages/Contests.tsx)

---

## 5) End-to-end flow (Run button: valid output + input handling)

Use run endpoint (already implemented in [`submissionController.runSubmission`](server/controllers/submissionController.js)).

Expected request body:
- `code` (Base64)
- `language`
- `input` (string from stdin textbox)
- optional `expectedOutput` (for side-by-side UI comparison)

Execution path:
- [`judgeClient.judgePool.run`](server/services/judgeClient.js)
- then [`judgeClient.executeSingleTestCase`](server/services/judgeClient.js)

Expected response shape:
- `success`
- `status`
- `stdout`
- `stderr`
- `executionTimeMs`
- `expectedOutput`

### Input best practices
1. Pass input as raw string, preserve newlines exactly.
2. Always send trailing newline if your language scanner expects line termination.
3. Avoid JSON-wrapping stdin content; keep plain text.

### Output best practices
1. Compare normalized outputs:
   - convert `\r\n` to `\n`
   - trim trailing whitespace for judge compare only
2. Show raw `stdout` and `stderr` separately in UI.
3. Truncate logs in DB/UI (already handled server-side).

---

## 6) Contest leaderboard connection

Two leaderboard paths exist in this repo:

1. **Native contest aggregation** via [`leaderboardController.computeLeaderboard`](server/controllers/leaderboardController.js), broadcast on AC from [server/controllers/submissionController.js](server/controllers/submissionController.js)
2. **AlgoForge leaderboard proxy** via [server/routes/leaderboardProxyRoutes.js](server/routes/leaderboardProxyRoutes.js) (`/api/leaderboard/update`, `/api/leaderboard/get`)

### Important mapping
AlgoForge leaderboard expects `contest_link_code` in request body (see [leaderboard-main/controllers/GetLeaderBoard.js](leaderboard-main/controllers/GetLeaderBoard.js)).

Ensure your frontend route param used in [client/apex-code-arena/src/pages/Leaderboard.tsx](client/apex-code-arena/src/pages/Leaderboard.tsx) maps to `contest_link_code` when calling proxy endpoints.

---

## 7) Language support consistency

Judge supports `cpp`, `c`, `python`, `java` from [judge-main/worker.js](judge-main/worker.js).

Ensure frontend language mapping (used in submit pages) is aligned:
- [client/apex-code-arena/src/pages/ProblemDetail.tsx](client/apex-code-arena/src/pages/ProblemDetail.tsx)
- [client/apex-code-arena/src/pages/Contests.tsx](client/apex-code-arena/src/pages/Contests.tsx)

---

## 8) Quick verification checklist

- [ ] `JUDGE_URL` and `LEADERBOARD_URL` configured in server env
- [ ] Judge reachable at `/execute`
- [ ] `POST /submissions/run` returns stdout/stderr correctly for sample input
- [ ] `POST /submissions` creates pending submission and resolves to final status
- [ ] Contest AC triggers leaderboard recompute/broadcast
- [ ] Leaderboard page displays rank list for selected contest code

---

## 9) Minimal API contract reference

### Judge request
`POST {JUDGE_URL}/execute`
```json
{
  "code": "print('hello')",
  "language": "python",
  "input": "",
  "timeLimit": 2,
  "memoryLimit": 256
}
```

### Judge success response
```json
{
  "success": true,
  "output": "hello\r\n",
  "timeTaken": "15ms",
  "status": "SUCCESS"
}
```

### Judge error response
```json
{
  "success": false,
  "error": "COMPILATION_ERROR",
  "message": "Code compilation failed",
  "details": {
    "stderr": "...",
    "lineNumber": 7,
    "column": 12
  }
}
```

---

## 10) Troubleshooting

- **“Unsupported language”**: normalize frontend values to judge-supported values.
- **Empty output on Run**: verify stdin formatting and newline handling.
- **Leaderboard empty**: verify `contest_link_code` mapping and service DB data source.
- **Judge unavailable**: confirm `JUDGE_URL` + service port + CORS/network reachability.
- **Long hangs**: verify time/memory limits and worker health.

---