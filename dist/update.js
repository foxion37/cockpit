import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { collectCockpitModel } from "./collect.js";
import { cockpitDir, cockpitFilePath } from "./paths.js";
import { renderCockpitFiles } from "./render.js";
import { COCKPIT_FILE_NAMES, KR_BATCH_FILE_NAMES, } from "./types.js";
export async function updateCockpit(repoRoot, options = {}) {
    const model = await collectCockpitModel(repoRoot);
    const files = [];
    if (options.profile === "kr-batch") {
        const rendered = renderCockpitFiles(model, { profile: "kr-batch" });
        for (const fileName of KR_BATCH_FILE_NAMES) {
            const path = join(repoRoot, ...fileName.split("/"));
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, ensureFinalNewline(rendered[fileName]), "utf8");
            files.push(path);
        }
        return {
            files,
            legacyFilesDetected: model.legacyFilesDetected,
            warnings: model.progress.warnings,
        };
    }
    const rendered = renderCockpitFiles(model);
    await mkdir(cockpitDir(repoRoot), { recursive: true });
    for (const fileName of COCKPIT_FILE_NAMES) {
        const path = cockpitFilePath(repoRoot, fileName);
        await writeFile(path, ensureFinalNewline(rendered[fileName]), "utf8");
        files.push(path);
    }
    return {
        files,
        legacyFilesDetected: model.legacyFilesDetected,
        warnings: model.progress.warnings,
    };
}
export function cockpitEvidencePath(repoRoot, fileName) {
    return join(cockpitDir(repoRoot), fileName);
}
function ensureFinalNewline(value) {
    return value.endsWith("\n") ? value : `${value}\n`;
}
