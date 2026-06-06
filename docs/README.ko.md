# Cockpit

<p align="center">
  <a href="../README.md">English</a> · <strong>한국어</strong>
</p>

<p align="center">
  <img src="../assets/cockpit-dot-hero.png" alt="Cockpit dot-image hero" width="100%">
</p>

<p align="center">
  <a href="https://github.com/foxion37/cockpit/actions/workflows/check.yml"><img src="https://github.com/foxion37/cockpit/actions/workflows/check.yml/badge.svg" alt="Check"></a>
  <img src="https://img.shields.io/badge/license-MIT-111111" alt="MIT license">
  <img src="https://img.shields.io/badge/status-public%20package-14b8a6" alt="public package">
</p>

Cockpit은 긴 Codex 작업을 위한 dot-image 감성의 작은 Markdown 조종석입니다. 계획, 진행률, 세션 상태, 구조 이해 정보를 모아서 `.cockpit/` 아래 네 개 파일로 정리합니다.

핵심은 단순함입니다. 파일을 많이 만들지 않고, 매번 같은 구조로 갱신하며, 사람이 보는 요약과 에이전트가 참고할 가드레일을 분리합니다.

### 기획 의도

Cockpit은 코딩 에이전트와 함께 작업하는 사람을 위한 작은 가드레일 문서 묶음입니다. 특히 초보자가 에이전트의 작업에 계속 `승인`만 하다가 작업이 샛길로 빠지는 상황을 줄이기 위해 만들었습니다.

어려운 개발 용어가 이어져서 지금 무슨 일이 일어나는지 헷갈릴 때, Cockpit을 보면 작업이 어디쯤 진행 중인지, 무엇이 바뀌었는지, 다음에 무엇을 확인해야 하는지 볼 수 있습니다. 에이전트에게도 “Cockpit 문서를 보고 확인해줘”라고 지시할 수 있습니다.

Cockpit을 제대로 쓰려면 처음 기획을 촘촘하게 하는 것이 좋습니다. 깊은 대화를 통해 의도, 단계, 성공 기준을 자세히 정리한 기획 문서일수록 Cockpit이 진행 상황을 더 정확하게 보여주고 작업 흐름을 더 잘 붙잡아 줍니다.

### 설치 방법

가장 쉬운 방법은 에이전트에게 설치를 맡기는 것입니다.

```text
이 repo에 foxion37/cockpit을 설치하고 첫 cockpit update까지 실행해줘.
가능하면 Cockpit skill을 사용해서 설치해줘.
```

npm으로 직접 설치할 수도 있습니다.

```sh
npm install -g github:foxion37/cockpit
cockpit update --repo-root "$PWD" --json
```

한 프로젝트 안에만 설치하려면 이렇게 씁니다.

```sh
npm install --save-dev github:foxion37/cockpit
npx cockpit update --repo-root "$PWD" --json
```

### 사용 장면

| 장면 | Cockpit이 해주는 일 |
| --- | --- |
| 작업이 길어질 때 | 전체 계획과 페이즈/배치 진행률을 한눈에 보여줍니다 |
| 여러 에이전트가 이어받을 때 | 다음 에이전트가 지켜야 할 경계와 원본 상태를 알려줍니다 |
| 코드 구조를 계속 파악해야 할 때 | Mermaid 구조도와 그래프 소스 상태를 같이 보여줍니다 |
| 한글 진행 보고가 필요할 때 | `/cavexplain` 말투로 짧고 분명하게 정리합니다 |
| 상태 파일이 너무 많아질 때 | 핵심 Cockpit 파일 네 개로 표면을 줄입니다 |

### 생성되는 파일

```text
.cockpit/
├─ WORKPLAN.md          전체 작업계획, 현재 진행률, 페이즈/배치 진행률
├─ ARCHITECTURE.md      Mermaid 구조도와 로컬 그래프 소스 상태
├─ STATUS_KR.md         /cavexplain 말투의 한글 진행상황
└─ AGENT_GUARDRAILS.md  다른 에이전트가 참고할 작업 경계와 주의사항
```

`WORKPLAN.md`는 메인 화면입니다. 전체 진행률, 현재 페이즈, 세부 배치, 막힌 점, 다음 작업, 텍스트 그래픽을 한곳에 보여줍니다.

`ARCHITECTURE.md`는 코드베이스를 어떻게 이해하고 있는지 보여줍니다. CodeGraph, codebase-memory, Understand-Anything 계열 소스가 있으면 그 상태를 함께 표시합니다.

`STATUS_KR.md`는 사용자가 바로 읽는 한글 요약입니다. `/cavexplain`처럼 짧고 선명하게 `결론`, `근거`, `리스크`, `다음` 중심으로 씁니다.

`AGENT_GUARDRAILS.md`는 다음 에이전트를 위한 파일입니다. 어디를 수정해도 되는지, 무엇을 원본 상태로 봐야 하는지, 오래된 출력에서 추론하면 안 되는 점을 적습니다.

### 게이지

내 작업이 어느 정도 진행됐는지 한눈에 보기 쉽게 마크다운에 게이지 형태로 표현합니다.

```text
┌─ 진행 레이더 ─────────────────────────────────┐
│ 전체        78%  ████████████░░░  순항        │
│ 계획        90%  █████████████░░  안정        │
│ 구현        72%  ███████████░░░░  진행        │
│ 검증        44%  ███████░░░░░░░░  주시        │
└───────────────────────────────────────────────┘

구조 이해     ████████░░
메모리 연결   ██████░░░░
인수인계      █████████░
```

터미널이나 로그에서 Unicode가 부담스러우면 ASCII 모드로 바꿀 수 있습니다.

```sh
COCKPIT_ASCII=1 cockpit update --repo-root "$PWD" --json
```

### 동작 구조

```mermaid
flowchart TD
    Prompt["사용자 요청 / 스킬 사용"] --> Hook["Cockpit hook"]
    Done["작업 완료 / Subagent 완료"] --> Hook
    Manual["수동 cockpit update"] --> Hook

    subgraph State["읽는 상태"]
        Plan["계획"]
        Ledger["진행 로그"]
        Graph["구조/그래프 소스"]
        Guard["가드레일"]
    end

    Hook --> State
    State --> Render["Markdown 렌더링"]

    Render --> W["WORKPLAN.md"]
    Render --> A["ARCHITECTURE.md"]
    Render --> S["STATUS_KR.md"]
    Render --> G["AGENT_GUARDRAILS.md"]

    W --> Human["사용자"]
    S --> Human
    A --> Agent["다음 에이전트"]
    G --> Agent
```

### 언제 업데이트되나요?

Codex plugin session 안에서는 hook을 통해 자동 갱신됩니다.

- Cockpit/skill 관련 프롬프트가 들어오면 필요한 경우 갱신합니다.
- 작업이 끝나는 `Stop` 시점에 갱신합니다.
- 서브에이전트가 끝나는 `SubagentStop` 시점에 갱신합니다.
- hook 실패는 다른 작업을 막지 않도록 빈 출력으로 처리합니다.

수동 갱신도 가능합니다.

```sh
cockpit update --repo-root "$PWD" --json
```

### 개발

```sh
npm install
npm test
npm run check
npm run build
```

## License

MIT

MIT가 모든 오픈소스 repo의 기본값인 것은 아닙니다. 라이선스를 명시하지 않으면 보통 재사용 가능한 오픈소스 권한이 자동으로 생기지 않습니다. Cockpit은 다른 사람이 쉽게 재사용하고 고쳐 쓸 수 있도록 의도적으로 MIT를 선택했습니다.
