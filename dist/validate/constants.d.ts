export declare const DEFAULT_MAX_COCKPIT_LINES = 170;
export declare const DEFAULT_MAX_BATCH_DOC_LINES = 220;
export declare const REQUIRED_KR_BATCH_SECTIONS: readonly ["## 한눈에 보기", "## 1. 전체 목표와 목표별 진행률", "## 2. 배치 구분과 배치별 진행률", "## 3. 이번 세션에서 달성한 진행률", "## 지금 사용자가 알면 되는 것", "## 다음 단계"];
export declare const INLINE_HTML_PATTERNS: readonly [{
    readonly pattern: RegExp;
    readonly detail: "<span";
}, {
    readonly pattern: RegExp;
    readonly detail: "</span>";
}, {
    readonly pattern: RegExp;
    readonly detail: "style=";
}];
export declare const PLACEHOLDER_PATTERNS: readonly [{
    readonly pattern: RegExp;
    readonly detail: "TODO";
}, {
    readonly pattern: RegExp;
    readonly detail: "TBD";
}, {
    readonly pattern: RegExp;
    readonly detail: "undefined";
}];
