import {
	fixedColumns,
	normalizePercent,
	pipeColumns,
	renderDotCells,
	renderProgressBar,
} from "./render-common.js";
import type { CockpitModel } from "./types.js";

export function renderStatusKr(model: CockpitModel): string {
	const { progress } = model;
	const safePercent = normalizePercent(progress.percentComplete);
	const currentTask = progress.currentTask ?? "없음";
	const riskText =
		progress.warnings.length === 0
			? "큰 경고 없음"
			: progress.warnings.join(" / ");
	return [
		"# 진행상황",
		"",
		"## 상태판",
		"",
		"```text",
		...renderKoreanStatusBoard(model, safePercent),
		"```",
		"",
		`미니 펄스 ${renderProgressBar(safePercent)} ${safePercent}%`,
		`미니 진행: ${progress.completedTasks}/${progress.totalTasks} 작업 완료, 남은 작업 ${progress.remainingTasks}개.`,
		`결론: 현재 진행률은 ${safePercent}%입니다.`,
		`근거: 다음 작업은 ${currentTask}입니다.`,
		`리스크: ${riskText}.`,
		`다음: ${progress.currentTask ?? "새 작업을 시작하세요."}`,
		"",
	].join("\n");
}

function renderKoreanStatusBoard(
	model: CockpitModel,
	safePercent: number,
): string[] {
	const { progress } = model;
	const currentTask = progress.currentTask ?? "없음";
	const riskText =
		progress.warnings.length === 0
			? "큰 경고 없음"
			: progress.warnings.join(" / ");

	return [
		pipeColumns([
			"진행률",
			`${safePercent}%`,
			renderProgressBar(safePercent),
			`${progress.completedTasks}/${progress.totalTasks} 완료`,
		]),
		pipeColumns([
			"현재 작업",
			currentTask,
			renderDotCells(progress.completedTasks, progress.totalTasks),
			progress.currentTask ? "다음 확인" : "새 작업 필요",
		]),
		fixedColumns(
			[
				"진행",
				`${safePercent}%`,
				renderProgressBar(safePercent),
				`${progress.completedTasks}/${progress.totalTasks} 완료`,
			],
			7,
		),
		fixedColumns(
			[
				"남은일",
				`${progress.remainingTasks}개`,
				renderDotCells(progress.completedTasks, progress.totalTasks),
				`다음: ${currentTask}`,
			],
			7,
		),
		fixedColumns(
			["리스크", progress.warnings.length === 0 ? "정상" : "주의", riskText],
			7,
		),
	];
}
