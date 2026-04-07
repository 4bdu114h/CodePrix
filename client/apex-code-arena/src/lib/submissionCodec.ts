/**
 * submissionCodec.ts
 * ──────────────────────────────────────────────────────────────────────
 * Unicode-safe Base64 serialization pipeline for source code payloads.
 *
 * Native `btoa()` fails on characters outside the Latin1 range (emojis,
 * CJK, etc.). This module uses a multi-stage encode:
 *   raw → encodeURIComponent → unescape → btoa
 * to produce a purely alphanumeric Base64 string safe for JSON transport.
 */

// ── Encode / Decode ──────────────────────────────────────────────────

/**
 * Encode a raw source-code string into a Unicode-safe Base64 payload.
 *
 * Pipeline:
 *  1. `encodeURIComponent` – escapes all non-ASCII / special chars to %XX sequences
 *  2. `unescape`           – maps those %XX bytes back to Latin1 char-codes
 *  3. `btoa`               – standard Base64 on the resulting Latin1 string
 */
export function encodeSourceCode(raw: string): string {
    return btoa(unescape(encodeURIComponent(raw)));
}

/**
 * Decode a Base64 payload back into a UTF-8 source-code string.
 * (Inverse of `encodeSourceCode`.)
 */
export function decodeSourceCode(b64: string): string {
    return decodeURIComponent(escape(atob(b64)));
}

// ── Language Map ─────────────────────────────────────────────────────

/**
 * Maps the display names used in the UI dropdowns to the
 * backend-accepted enum values stored in the Submission schema.
 */
export const LANG_MAP: Record<string, string> = {
    "C++": "cpp",
    Python: "python",
    Java: "java",
    JavaScript: "javascript",
};
