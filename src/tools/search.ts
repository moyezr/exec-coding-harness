import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../types.ts";
import { boundedLimit, displayPath, walkFiles } from "./filesystem.ts";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export const searchTool: Tool = {
    name: "search",
    description: "Search text in files under a directory. Supports plain text or regular expressions and returns matching file, line number, and line content.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Text or regular expression to search for" },
            path: { type: "string", description: "File or directory to search (default .)" },
            regex: { type: "boolean", description: "Interpret query as a JavaScript regular expression (default false)" },
            case_sensitive: { type: "boolean", description: "Case-sensitive search (default false)" },
            file_pattern: { type: "string", description: "Optional filename glob, e.g. *.ts" },
            limit: { type: "number", description: "Maximum matching lines (default 100, maximum 1000)" },
        },
        required: ["query"],
    },
    async execute(args) {
        const query = String(args.query ?? "");
        if (!query) throw new Error("query must not be empty");
        const sensitive = args.case_sensitive === true;
        let matcher: RegExp;
        try {
            const source = args.regex === true ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            matcher = new RegExp(source, sensitive ? "g" : "gi");
        } catch (error) {
            throw new Error(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
        }
        const root = resolve(process.cwd(), String(args.path ?? "."));
        const limit = boundedLimit(args.limit, 100, 1000);
        const filePattern = typeof args.file_pattern === "string" ? new RegExp(`^${args.file_pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i") : undefined;
        const results: string[] = [];
        const searchOne = async (path: string) => {
            const metadata = await stat(path);
            if (!metadata.isFile() || metadata.size > MAX_FILE_BYTES) return;
            if (filePattern && !filePattern.test(path.split(/[\\/]/).pop() ?? "")) return;
            const buffer = await readFile(path);
            if (buffer.includes(0)) return;
            const lines = buffer.toString("utf8").split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                matcher.lastIndex = 0;
                if (matcher.test(lines[i])) {
                    const line = lines[i].length > 500 ? `${lines[i].slice(0, 500)}… [line truncated]` : lines[i];
                    results.push(`${displayPath(path)}:${i + 1}: ${line}`);
                    if (results.length >= limit) return;
                }
            }
        };
        const metadata = await stat(root);
        if (metadata.isFile()) await searchOne(root);
        else {
            for await (const entry of walkFiles(root)) {
                if (entry.kind === "file") await searchOne(entry.path);
                if (results.length >= limit) break;
            }
        }
        return results.length ? results.join("\n") : "No matches found.";
    },
};
