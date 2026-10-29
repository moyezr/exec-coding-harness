import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../types.ts";
import { displayPath } from "./filesystem.ts";

export const statsTool: Tool = {
    name: "file_stats",
    description: "Get file or directory metadata including type, size, permissions, and timestamps.",
    parameters: {
        type: "object",
        properties: { path: { type: "string", description: "File or directory path, relative to the current folder" } },
        required: ["path"],
    },
    async execute(args) {
        const path = resolve(process.cwd(), String(args.path));
        const info = await lstat(path);
        const kind = info.isFile() ? "file" : info.isDirectory() ? "directory" : info.isSymbolicLink() ? "symlink" : "other";
        return [
            `Path: ${displayPath(path)}`,
            `Type: ${kind}`,
            `Size: ${info.size} bytes`,
            `Permissions: ${(info.mode & 0o777).toString(8)}`,
            `Modified: ${info.mtime.toISOString()}`,
            `Created: ${info.birthtime.toISOString()}`,
            `Accessed: ${info.atime.toISOString()}`,
        ].join("\n");
    },
};
