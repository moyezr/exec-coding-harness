import type { Tool } from "../types.ts";
import { resolve } from "node:path";
import { boundedLimit, displayPath, walkFiles } from "./filesystem.ts";

function globRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
}

export const findTool: Tool = {
    name: "find_files",
    description: "Find files or directories by name. Supports * and ? wildcards, matching either the basename or relative path.",
    parameters: {
        type: "object",
        properties: {
            name: { type: "string", description: "Name or wildcard pattern, e.g. *.ts or src/**/test?.ts" },
            path: { type: "string", description: "Directory to search from (default .)" },
            type: { type: "string", enum: ["file", "directory", "any"], description: "Entry kind (default file)" },
            limit: { type: "number", description: "Maximum matches (default 100, maximum 1000)" },
            include_hidden: { type: "boolean", description: "Include hidden entries (default false)" },
        },
        required: ["name"],
    },
    async execute(args) {
        const pattern = String(args.name ?? "");
        if (!pattern) throw new Error("name must not be empty");
        const matcher = globRegex(pattern);
        const root = String(args.path ?? ".");
        const wanted = args.type === "directory" ? "directory" : args.type === "any" ? "any" : "file";
        const limit = boundedLimit(args.limit, 100, 1000);
        const matches: string[] = [];
        for await (const entry of walkFiles(resolve(process.cwd(), root), true, args.include_hidden === true)) {
            const rel = displayPath(entry.path);
            if ((wanted === "any" || entry.kind === wanted) && (matcher.test(entry.name) || matcher.test(rel))) {
                matches.push(`${entry.kind === "directory" ? "[dir] " : "[file] "}${rel}`);
                if (matches.length >= limit) break;
            }
        }
        return matches.length ? matches.join("\n") : "No matches found.";
    },
};
