export const DEFAULT_MAX_COCKPIT_LINES = 170;
export const DEFAULT_MAX_BATCH_DOC_LINES = 220;

export const REQUIRED_KR_BATCH_SECTIONS = [
	"## 한눈에 보기",
	"## 1. 전체 목표와 목표별 진행률",
	"## 2. 배치 구분과 배치별 진행률",
	"## 3. 이번 세션에서 달성한 진행률",
	"## 지금 사용자가 알면 되는 것",
	"## 다음 단계",
] as const;

export const INLINE_HTML_PATTERNS = [
	{ pattern: /<span\b/iu, detail: "<span" },
	{ pattern: /<\/span>/iu, detail: "</span>" },
	{ pattern: /style\s*=/iu, detail: "style=" },
] as const;

export const PLACEHOLDER_PATTERNS = [
	{ pattern: /\bTODO\b/iu, detail: "TODO" },
	{ pattern: /\bTBD\b/iu, detail: "TBD" },
	{ pattern: /\bundefined\b/iu, detail: "undefined" },
] as const;
