import {
	listOrNone,
	normalizePercent,
	renderProgressBar,
} from "./render-common.js";
import type { CockpitModel, KrBatchRenderedFiles } from "./types.js";

export function renderKrBatchFiles(model: CockpitModel): KrBatchRenderedFiles {
	return {
		"COCKPIT_KR.md": renderKrBatchCockpit(model),
		"docs/batches/README.md": renderKrBatchIndex(),
		"docs/batches/current-batch.md": renderCurrentBatchDoc(model),
	};
}

function renderKrBatchCockpit(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "정해진 작업 없음";
	const activePlanName = progress.activePlanName ?? "계획 없음";
	const status = renderKoreanStatus(progress.status);
	const remainingText =
		progress.remainingTasks === 0
			? "남은 작업 없음"
			: `${progress.remainingTasks}개 남음`;

	return [
		"# Cockpit",
		"",
		`상태: **${status}**`,
		"문서 성격: 비개발자용 현재 상황판",
		"",
		"> 이 문서는 지금 어디까지 왔는지만 짧게 보여줍니다.",
		"> 자세한 작업 기록과 기술 판단은 `docs/batches/` 아래 문서에 둡니다.",
		"",
		"## 한눈에 보기",
		"",
		`현재 계획은 **${activePlanName}**이고, 지금 보는 작업은 **${currentTask}**입니다.`,
		"",
		"| 구분 | 진행률 |",
		"|---|---|",
		`| 전체 목표 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 현재 배치 묶음 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 이번 세션 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		"",
		"```mermaid",
		"flowchart LR",
		`  O["전체 목표<br/>${safePercent}%"] --> B["현재 배치 묶음<br/>${safePercent}%"] --> S["이번 세션<br/>${safePercent}%"]`,
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  classDef caution fill:#fef3c7,stroke:#f59e0b,color:#78350f",
		"  class O,B active",
		"  class S caution",
		"```",
		"",
		"## 1. 전체 목표와 목표별 진행률",
		"",
		"| 목표 | 쉬운 설명 | 진행률 |",
		"|---|---|---|",
		`| 현재 계획 | 진행 중인 계획을 끝까지 검증 가능한 상태로 정리 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 완료 기준 | 테스트, 빌드, 수동 확인까지 남기기 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		"",
		"```mermaid",
		"flowchart LR",
		`  G1["현재 계획<br/>${safePercent}%"] --> G2["완료 기준<br/>${safePercent}%"]`,
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d",
		"  class G1 active",
		"  class G2 done",
		"```",
		"",
		"## 2. 배치 구분과 배치별 진행률",
		"",
		"| 배치 | 지금의 의미 | 상태 | 진행률 | 자세한 문서 |",
		"|---|---|---|---|---|",
		`| 현재 배치 | ${currentTask} | **${status}** | ${renderProgressBar(safePercent)} **${safePercent}%** | \`docs/batches/current-batch.md\` |`,
		"",
		"```mermaid",
		"flowchart LR",
		`  B["현재 배치<br/>${safePercent}%"] --> D["상세 문서<br/>docs/batches/"]`,
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  classDef caution fill:#fef3c7,stroke:#f59e0b,color:#78350f",
		"  class B active",
		"  class D caution",
		"```",
		"",
		"## 3. 이번 세션에서 달성한 진행률",
		"",
		"| 이번 세션 | 진행률 |",
		"|---|---|",
		`| 완료한 일 | ${renderProgressBar(safePercent)} **${safePercent}%** |`,
		`| 남은 일 | ${remainingText} |`,
		"",
		"```mermaid",
		"flowchart LR",
		`  S1["완료한 일<br/>${safePercent}%"] --> S2["남은 일<br/>${remainingText}"]`,
		"  classDef active fill:#dbeafe,stroke:#2563eb,color:#1e3a8a",
		"  classDef caution fill:#fef3c7,stroke:#f59e0b,color:#78350f",
		"  class S1 active",
		"  class S2 caution",
		"```",
		"",
		"## 자세한 문서",
		"",
		"- `docs/batches/README.md`",
		"- `docs/batches/current-batch.md`",
		"",
	].join("\n");
}

function renderKrBatchIndex(): string {
	return [
		"# Batch별 상세 문서",
		"",
		"이 폴더는 Cockpit에 다 담기에는 긴 내용을 보관하는 곳입니다.",
		"",
		"## 문서",
		"",
		"- `docs/batches/current-batch.md`",
		"",
		"## 작성 기준",
		"",
		"- Cockpit에는 링크와 진행률만 짧게 둡니다.",
		"- 명령어, 로그, 기술 판단은 batch 문서에 둡니다.",
		"- 새 batch 문서는 목표, 확인한 것, 남은 조심거리를 포함합니다.",
		"",
	].join("\n");
}

function renderCurrentBatchDoc(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "현재 배치";
	const warnings =
		progress.warnings.length === 0
			? ["- 아직 따로 적을 조심거리는 없습니다."]
			: listOrNone(progress.warnings);

	return [
		"# 현재 배치 상세 문서",
		"",
		`상태: **${renderKoreanStatus(progress.status)}**`,
		`진행률: ${renderProgressBar(safePercent)} **${safePercent}%**`,
		"",
		"## 목표",
		"",
		`이번 배치는 **${currentTask}** 작업을 끝까지 구현하고 검증하는 것이 목표입니다.`,
		"",
		"## 확인한 것",
		"",
		`- 완료한 작업: ${progress.completedTasks}/${progress.totalTasks}`,
		`- 남은 작업: ${progress.remainingTasks}`,
		"",
		"## 남은 조심거리",
		"",
		...warnings,
		"",
	].join("\n");
}

function renderKoreanStatus(status: string): string {
	switch (status) {
		case "not_started":
			return "대기";
		case "in_progress":
			return "진행 중";
		case "complete":
			return "완료";
		case "blocked":
			return "막힘";
		case "warning":
			return "주의";
		default:
			return status;
	}
}
