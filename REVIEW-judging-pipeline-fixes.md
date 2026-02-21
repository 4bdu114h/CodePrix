# Code Review: CodePrix Judging Pipeline Fixes

## Overview

This document reviews the changes made to fix the CodePrix judging pipeline across 5 layers. The implementation correctly wires the bel-Forge judge into the main submission flow and adds multi-test-case evaluation with output comparison.

---

## 1. worker.js — Multi-Test-Case Evaluation

### What Changed
- Iterates over `testCases[]` instead of a single `input`
- Compares `actualOut` vs `expected` using normalized output
- Returns `WA` with `failedTestCase` index on mismatch
- Maps all error types (CE, TLE, MLE, RE) via `mapErrorToStatus()`
- Backwards-compat fallback: `[{ input: '', output: '' }]` when no test cases

### Strengths
- Clean separation: `executeCode` handles single run; module export handles multi-test orchestration
- Correct unit conversions: `timeLimit` ms → seconds, `memoryLimit` KB → MB
- `failedTestCase` is 0-based index (matches schema)
- Truncates logs to 2048 chars before storing

### Findings

| Severity | Item | Recommendation |
|----------|------|----------------|
| Low | `result.timeTaken` parsing | `executeCode` returns `timeTaken: "${endTime - startTime}ms"` (string). `parseInt(result.timeTaken)` yields `45` from `"45ms"` (parseInt stops at non-digit). Works but brittle; consider returning numeric `executionTimeMs` from `executeCode` for clarity. |
| Low | Output normalization | Current: `replace(/\r\n/g, '\n').trim()`. Does not trim trailing spaces per line. Many judges use strict per-line trim. Consider `expectedOut.split('\n').map(l => l.trimEnd()).join('\n').trim()` if you need stricter matching. |
| Info | `maxMemory` never set | Worker tracks `maxTime` but `maxMemory` stays 0. `executeCode`/`runCode` don't return memory. Acceptable if memory tracking is future work. |

### Verification
- Test-case loop logic is correct
- Error propagation from `executeCode` to final status works
- Piscina worker export signature matches queue expectations

---

## 2. submissionRoutes.js — Route Wiring

### What Changed
- Replaced inline fake judge with delegation to `createSubmission`
- Added `getSubmission` for single submission by ID

### Strengths
- Minimal, focused change
- Correct middleware order: `protect` → `createSubmission`
- `GET /my` and `GET /:id` properly protected

### Findings

| Severity | Item | Recommendation |
|----------|------|----------------|
| Medium | Contest time window removed | Old route enforced: submission only allowed when `Contest.findOne({ problems: problemId, startTime ≤ now ≤ endTime })`. Controller accepts `contestId` from body without validating contest exists or is active. If contest-only mode is required, add contest-time validation in `submissionController` or as middleware. |

---

## 3. submissionController.js — bel-Forge Integration

### What Changed
- Leaderboard URL: `process.env.LEADERBOARD_URL || 'http://localhost:5000'`
- Passes `testCases` from problem to queue

### Strengths
- 202 response with `submissionId` (async pattern)
- Background pipeline: DB update + leaderboard sync on AC
- IE fallback when background update fails
- `headersSent` guard before error response

### Findings

| Severity | Item | Recommendation |
|----------|------|----------------|
| Low | `contestId` from client | Client-supplied `contestId` is trusted. Consider resolving active contest server-side (as old route did) to prevent spoofing. |
| Info | Leaderboard integration | Leaderboard app uses its own DB; sync POST may not persist in main app's context. Document that leaderboard runs separately. |

---

## 4. authMiddleware.js & authRoutes.js — JWT_SECRET

### What Changed
- `"secretkey"` → `process.env.JWT_SECRET`

### Strengths
- Secrets no longer hardcoded
- `.env` contains `JWT_SECRET` and is loaded via `dotenv`

### Findings

| Severity | Item | Recommendation |
|----------|------|----------------|
| Low | No fallback | If `JWT_SECRET` is missing, `jwt.verify` receives `undefined`. Add startup check: `if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET required')`. |

---

## 5. apply-submission-validator.js — Schema Alignment

### What Changed
- Validator uses `user`, `problem`, `contest` (ObjectId) — aligned with Mongoose schema

### Strengths
- Matches Submission model field names
- Covers status enum, metrics, failedTestCase, logs

### Verification
- `submissionController` creates documents with `user: userId`, `problem: problemId`, `contest: contestId` — correct

---

## 6. .env Configuration

### Current State
```
MONGO_URI=...
JWT_SECRET=Ld9ZXCJhsnxxzmXBugy6Z9cr3sumkBqm
PORT=8000
LEADERBOARD_URL=http://localhost:5000
```

### Strengths
- All required vars present for the judging pipeline

### Recommendations
- Add `.env.example` (without secrets) for onboarding
- Ensure `.env` is in `.gitignore` (do not commit secrets)

---

## 7. Require-Chain Verification

```
server.js
  └─ submissionRoutes
       ├─ authMiddleware ✓
       └─ submissionController ✓
            └─ queue (bel-Forge/judge-main)
                 └─ worker.js ✓
```

All layers resolve correctly. No circular dependencies observed.

---

## 8. Summary Table

| File | Status | Notes |
|------|--------|-------|
| worker.js | ✅ | Multi-test-case + output comparison implemented |
| submissionRoutes.js | ✅ | Delegation to controller; contest check removed |
| submissionController.js | ✅ | LEADERBOARD_URL from env; contest validation optional |
| authMiddleware.js | ✅ | JWT_SECRET from env |
| authRoutes.js | ✅ | JWT_SECRET from env |
| apply-submission-validator.js | ✅ | user/problem/contest aligned |
| .env | ✅ | JWT_SECRET, LEADERBOARD_URL present |

---

## 9. Recommended Next Steps

1. **Restore contest time window (if required)**  
   In `submissionController.createSubmission`, before creating the submission:
   - Look up active contest for `problemId` (startTime ≤ now ≤ endTime)
   - Use that contest's `_id` for `contestId`, or reject if none active

2. **End-to-end test**
   - Create a problem with non-trivial test cases
   - Submit correct code → expect AC
   - Submit wrong code → expect WA with `failedTestCase`
   - Submit invalid syntax → expect CE

3. **JWT_SECRET validation**
   - Add a startup check in `server.js` so the app fails fast if `JWT_SECRET` is missing

---

## Verdict

The judging pipeline fixes are correctly implemented. The fake judge has been replaced with real bel-Forge evaluation, test-case iteration, and output comparison. The main behavior change to be aware of is the removal of the contest time window; restore it if your product requires contest-only submissions.
