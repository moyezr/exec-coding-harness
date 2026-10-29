import type { Tool } from "../types.ts";
import { bashTool } from "./bash.ts";
import { findTool } from "./find.ts";
import { listTool } from "./list.ts";
import { readTool } from "./read.ts";
import { searchTool } from "./search.ts";
import { statsTool } from "./stats.ts";

export const tools: Tool[] = [
    readTool,
    listTool,
    findTool,
    searchTool,
    statsTool,
    bashTool,
];
