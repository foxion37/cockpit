import { renderDefaultFiles } from "./render-default.js";
import { renderKrBatchFiles } from "./render-kr-batch.js";
export function renderCockpitFiles(model, options = {}) {
    if (options.profile === "kr-batch") {
        return renderKrBatchFiles(model);
    }
    return renderDefaultFiles(model);
}
