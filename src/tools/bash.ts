import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { Tool } from "../types.ts";

const MAX_LINES = 2000;
const MAX_BYTES = 50 * 1024;


export function findBash(): string {
    if (process.platform !== "win32") return "bash";
    const candidates = [
        `${process.env.ProgramFiles}\\Git\\bin\\bash.exe`,
        `${process.env["ProgramFiles(x86)"]}\\Git\\bin\\bash.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Git\\bin\\bash.exe`,
    ];
    const known = candidates.find((p) => existsSync(p));
    if (known) return known;
    // Git can live on any drive, so also look along PATH, skipping the WSL launcher in System32
    for (const dir of (process.env.PATH ?? "").split(delimiter)) {
        if (!dir || /\\system32$/i.test(dir.replace(/\\+$/, ""))) continue;
        const candidate = join(dir, "bash.exe");
        if (existsSync(candidate)) return candidate;
    }
    return "bash"; // fall back to whatever bash is on PATH
}

function runBash(command: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve) => {
        const child = spawn(findBash(), ["-c", command], { cwd: process.cwd(), windowsHide: true });
        let out = ""; // to collect the output.

        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));

        const timer = setTimeout(() => {
            // the timeout has been reached, kill the process
            if (process.platform === "win32") {
                spawn("taskkill", ["/F", "/T", "/PID", String(child.pid)]);
            } else {
                child.kill("SIGKILL");
            }

            out += `\n [timed out after ${timeoutMs / 1000} s]`;
        }, timeoutMs)

        child.on("error", (e) => {
            clearTimeout(timer);
            resolve(`failed to start bash: ${e.message}`);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve(`${out} \n [exit code: ${code}]`);
        })
    })
}

export function truncateTrail(text: string, maxLines = MAX_LINES, maxBytes = MAX_BYTES): string {
    const lines = text.split("\n");
    let kept = lines.slice(-maxLines); // keep the last maxLines lines

    while (kept.length > 1 && Buffer.byteLength(kept.join("\n")) > maxBytes) kept.shift();

    let out = kept.join("\n");
    if (Buffer.byteLength(out) > maxBytes) out = out.slice(-maxBytes); // keep the last maxBytes bytes   

    if (kept.length === lines.length && out.length === text.length) return out; // no truncation needed

    return `[truncated: showing the last ${kept.length} of ${lines.length} lines]\n${out}`;
}

export const bashTool: Tool = {
    name: "bash",
    description: "Run a bash command in the current folder. Returns stdout, stderr, and the exit code.",

    parameters: {
        type: "object",
        properties: {
            command: {
                type: 'string',
                description: "The bash command to run"
            },
            timeout: {
                type: "number",
                description: "Timeout in seconds (default: 30)"
            },
            required: ["command"]
        }
    },

    async execute(args) {
        const seconds = typeof args.timeout === "number" ? args.timeout : 30;
        const command = args.command as string;
        return truncateTrail(await runBash(String(args.commands), seconds * 1000));
    }
}