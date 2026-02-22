import { describe, it, expect } from "vitest";
import { encodeSourceCode, decodeSourceCode, LANG_MAP } from "@/lib/submissionCodec";

describe("submissionCodec", () => {
    describe("encodeSourceCode / decodeSourceCode roundtrip", () => {
        it("should roundtrip a simple ASCII string", () => {
            const raw = 'console.log("hello world");';
            const encoded = encodeSourceCode(raw);
            expect(typeof encoded).toBe("string");
            expect(encoded).not.toContain(" ");       // No spaces in Base64
            expect(decodeSourceCode(encoded)).toBe(raw);
        });

        it("should roundtrip source code with newlines and backslashes", () => {
            const raw = '#include <iostream>\nint main() {\n\treturn 0;\n}\n';
            const encoded = encodeSourceCode(raw);
            expect(decodeSourceCode(encoded)).toBe(raw);
        });

        it("should roundtrip a string containing Windows line endings (CRLF)", () => {
            const raw = "line1\r\nline2\r\nline3";
            expect(decodeSourceCode(encodeSourceCode(raw))).toBe(raw);
        });

        it("should roundtrip a string with backslash-heavy content", () => {
            const raw = 'const path = "C:\\\\Users\\\\test\\\\file.txt";';
            expect(decodeSourceCode(encodeSourceCode(raw))).toBe(raw);
        });

        it("should roundtrip Unicode / Emoji content that would crash btoa()", () => {
            const raw = '// 🚀 emoji comment\nconsole.log("héllo wörld 你好 🌍");';
            const encoded = encodeSourceCode(raw);
            expect(decodeSourceCode(encoded)).toBe(raw);
        });

        it("should roundtrip multibyte CJK and Cyrillic characters", () => {
            const raw = "// 日本語のコメント\n// Привет мир";
            expect(decodeSourceCode(encodeSourceCode(raw))).toBe(raw);
        });

        it("should handle an empty string", () => {
            expect(encodeSourceCode("")).toBe("");
            expect(decodeSourceCode("")).toBe("");
        });

        it("should produce pure Base64 output (no raw special chars)", () => {
            const raw = 'alert("test\nwith\nnewlines\tand\ttabs");';
            const encoded = encodeSourceCode(raw);
            // Base64 alphabet: A-Z, a-z, 0-9, +, /, =
            expect(encoded).toMatch(/^[A-Za-z0-9+/=]*$/);
        });

        it("should roundtrip JSON-like strings with quotes and brackets", () => {
            const raw = '{"key": "value", "nested": {"arr": [1, 2, 3]}}';
            expect(decodeSourceCode(encodeSourceCode(raw))).toBe(raw);
        });
    });

    describe("LANG_MAP", () => {
        it('should map "C++" to "cpp"', () => {
            expect(LANG_MAP["C++"]).toBe("cpp");
        });

        it('should map "Python" to "python"', () => {
            expect(LANG_MAP["Python"]).toBe("python");
        });

        it('should map "Java" to "java"', () => {
            expect(LANG_MAP["Java"]).toBe("java");
        });

        it('should map "JavaScript" to "javascript"', () => {
            expect(LANG_MAP["JavaScript"]).toBe("javascript");
        });

        it("should return undefined for unmapped languages", () => {
            expect(LANG_MAP["Rust"]).toBeUndefined();
        });
    });
});
