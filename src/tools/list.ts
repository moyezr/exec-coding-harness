import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../types.ts";
import { boundedLimit, DEFAULT_IGNORES, displayPath, walkFiles } from "./filesystem.ts";

export const listTool: Tool = {
    name: "list",
    description: "List files and directories. Set recursive=true to walk subdirectories; hidden and common generated directories are skipped by default.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Directory to list, relative to the current folder (default .)" },
            recursive: { type: "boolean", description: "Include nested entries (default false)" },
            include_hidden: { type: "boolean", description: "Include hidden entries (default false)" },
            limit: { type: "number", description: "Maximum entries to return (default 500, maximum 5000)" },
        },
    },
    async execute(args) {
        const root = resolve(process.cwd(), String(args.path ?? "."));
        const recursive = args.recursive === true;
        const includeHidden = args.include_hidden === true;
        const limit = boundedLimit(args.limit, 500, 5000);
        const results: string[] = [];
        if (recursive) {
            for await (const entry of walkFiles(root, true, includeHidden)) {
                results.push(`${entry.kind === "directory" ? "[dir] " : "[file] "}${displayPath(entry.path)}`);
                if (results.length >= limit) break;
            }
        } else {
            const entries = await readdir(root, { withFileTypes: true });
            entries.sort((a, b) => a.name.localeCompare(b.name));
            for (const entry of entries) {
                if ((!includeHidden && entry.name.startsWith(".")) || DEFAULT_IGNORES.has(entry.name) || entry.isSymbolicLink()) continue;
                results.push(`${entry.isDirectory() ? "[dir] " : entry.isFile() ? "[file] " : "[other] "}${displayPath(resolve(root, entry.name))}`);
                if (results.length >= limit) break;
            }
        }
        return results.length ? results.join("\n") : "No entries found.";
    },
};
