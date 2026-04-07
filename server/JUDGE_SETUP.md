# Judge Service Setup

The CodePrix server uses the **judge-main** service as the code execution backend for Submit and Run.

## Prerequisites

Start the judge service **before** running the CodePrix server. The server expects it at the URL configured in `JUDGE_URL` (default: `http://localhost:3000`).

## Running judge-main

```sh
cd CodePrix/judge-main
npm install
node server.js
```

> If `npm start` fails (e.g. missing index.js), use `node server.js` directly.

By default, judge-main runs on port **3000**. To use a different port:

```sh
PORT=3001 npm start
```

Then set `JUDGE_URL=http://localhost:3001` in the server's `.env`.

## Running the full stack

1. **judge-main** (port 3000):
   ```sh
   cd CodePrix/judge-main && npm start
   ```

2. **CodePrix server** (port 8000):
   ```sh
   cd CodePrix/server && npm start
   ```

3. **Frontend** (port 8080):
   ```sh
   cd CodePrix/client/apex-code-arena && npm run dev
   ```

## Supported languages

judge-main supports: **C++**, **C**, **Python**, **Java**. JavaScript is not supported; those submissions will fail with an error.
