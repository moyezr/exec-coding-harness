import { readdir } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

export const DEFAULT_IGNORES = new Set([".git", "node_modules", ".next", "dist", "build"]);

export function workingPath(path: unknown = "."): string {
    return resolve(process.cwd(), typeof path === "string" ? path : ".");
}

export function displayPath(path: string): string {
    const rel = relative(process.cwd(), path);
    return rel.split(sep).join("/") || ".";
}

export type WalkEntry = { path: string; name: string; kind: "file" | "directory" };

/** Walk a directory without following symlinks. */
export async function* walkFiles(root: string, recursive = true, includeHidden = false): AsyncGenerator<WalkEntry> {
    async function* visit(directory: string): AsyncGenerator<WalkEntry> {
        const entries = await readdir(directory, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            if (!includeHidden && entry.name.startsWith(".")) continue;
            if (DEFAULT_IGNORES.has(entry.name)) continue;
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                yield { path, name: entry.name, kind: "directory" };
                if (recursive) yield* visit(path);
            } else if (entry.isFile()) {
                yield { path, name: entry.name, kind: "file" };
            }
        }
    }
    yield* visit(root);
}

export function boundedLimit(value: unknown, fallback: number, maximum: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.max(1, Math.min(Math.floor(value), maximum));
}
