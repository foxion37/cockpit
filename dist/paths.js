import { join } from "node:path";
import { COCKPIT_DIR } from "./types.js";
export function cockpitDir(repoRoot) {
    return join(repoRoot, ...COCKPIT_DIR.split("/"));
}
export function cockpitFilePath(repoRoot, fileName) {
    return join(cockpitDir(repoRoot), fileName);
}
