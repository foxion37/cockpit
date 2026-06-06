import { join } from "node:path";

import { COCKPIT_DIR, type CockpitFileName } from "./types.js";

export function cockpitDir(repoRoot: string): string {
	return join(repoRoot, ...COCKPIT_DIR.split("/"));
}

export function cockpitFilePath(
	repoRoot: string,
	fileName: CockpitFileName,
): string {
	return join(cockpitDir(repoRoot), fileName);
}
