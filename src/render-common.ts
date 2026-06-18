export function listOrNone(values: readonly string[]): string[] {
	return values.length === 0 ? ["- none"] : values.map((value) => `- ${value}`);
}

export function normalizePercent(percent: number): number {
	if (!Number.isFinite(percent)) {
		return 0;
	}

	return Math.min(100, Math.max(0, Math.round(percent)));
}

export function renderProgressBar(percent: number, barWidth = 20): string {
	const safePercent = normalizePercent(percent);
	const filledCells = Math.round((safePercent / 100) * barWidth);
	const emptyCells = barWidth - filledCells;
	const filled = process.env["COCKPIT_ASCII"] === "1" ? "#" : "█";
	const empty = process.env["COCKPIT_ASCII"] === "1" ? "-" : "░";

	return `[${filled.repeat(filledCells)}${empty.repeat(emptyCells)}]`;
}

export function renderDotCells(completed: number, total: number): string {
	if (total <= 0) {
		return "[]";
	}

	const safeCompleted = Math.min(total, Math.max(0, completed));
	return `[${"●".repeat(safeCompleted)}${"○".repeat(total - safeCompleted)}]`;
}

export function pipeColumns(values: readonly string[]): string {
	const widths = [33, 7, 22];
	return values
		.map((value, index) => {
			const width = widths[index];
			return width === undefined ? value : padDisplay(value, width);
		})
		.join(" | ");
}

export function fixedColumns(
	values: readonly string[],
	firstColumnWidth: number,
): string {
	return values
		.map((value, index) =>
			index === 0 ? padCharacters(value, firstColumnWidth) : value,
		)
		.join("  ")
		.trimEnd();
}

function padCharacters(value: string, width: number): string {
	const padding = Math.max(0, width - value.length);
	return `${value}${" ".repeat(padding)}`;
}

function padDisplay(value: string, width: number): string {
	const padding = Math.max(0, width - displayWidth(value));
	return `${value}${" ".repeat(padding)}`;
}

function displayWidth(value: string): number {
	let width = 0;
	for (const character of value) {
		width += characterDisplayWidth(character);
	}
	return width;
}

function characterDisplayWidth(character: string): number {
	const codePoint = character.codePointAt(0) ?? 0;
	const isWide =
		(codePoint >= 0x1100 && codePoint <= 0x115f) ||
		(codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
		(codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
		(codePoint >= 0xf900 && codePoint <= 0xfaff) ||
		(codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
		(codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
		(codePoint >= 0xff00 && codePoint <= 0xff60) ||
		(codePoint >= 0xffe0 && codePoint <= 0xffe6);

	return isWide ? 2 : 1;
}
