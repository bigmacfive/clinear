# Verification — 19 October 2026

## Automated checks

- 18 behavioral tests pass: CLI event parsing, provider failure, literal argument passing, GitHub URL validation, interruption recovery, duplicate/worktree locks, cancellation, successful and failed tests, uncertain publication reconciliation, secret redaction, research deduplication, readiness questions, pause-during-triage, and batch limits.
- TypeScript checking and Vite/Node builds pass.
- Rust release compilation and the current-Mac Tauri `.app` bundle succeed.

## Real integrations and desktop checks

- Packaged Tauri app launched with a working Rust → Node → SQLite bridge.
- Existing Codex login responded successfully and Cline SDK produced real planning/triage results through the local Codex model adapter.
- Parallel anonymous Search MCP returned actual sources. A real discovery scan added two Clinear improvement cards with linked references; six-hour discovery was saved in the desktop app.
- GitHub issue #1 in `bigmacfive/clinear-dispatch-demo` was imported using the explicitly selected GitHub CLI fallback.
- Autopilot blocked a card that included external publishing in its scope. After clarifying the local coding scope, it dispatched Codex, which reproduced the failing test and produced a fix with 4 passing tests. The original checkout remains unchanged; changes are in a Clinear worktree.
- Grok's first review was interrupted by an unavailable personal MCP tool. Its exit-zero `cancelled` event exposed a parser issue, now fixed and covered by a regression assertion. The original run record was corrected to failed with an audit event. The adapter now uses documented permission-rule names. Peer review has been narrowed to a tool-free evidence review: the backend supplies the actual diff and recorded implementation command logs. Grok then completed a real review with “No findings,” correctly describing the initial failing test, the fix, 4 passing tests, and clean whitespace checks. It did not independently execute tests.

- Independently reran the demo worktree tests outside the agent: 4 passed, 0 failed; `git diff --check` passed.
- Visually verified the final ObsidianUI-inspired purple theme in the packaged native app, original LobeHub SVGs, and disabled Hermes/OpenClaw/Kimi entries. Screenshot: `artifacts/clinear-obsidian-board.png` (local artifact).

## Limits

Composio has an implemented session/OAuth/proxy and verified-publication path, but no Composio key was supplied, so **Composio live authentication and calls are not verified**. The GitHub CLI fallback is clearly labelled and is not sponsor integration evidence.

Claude is optional and was not used for implementation. Hermes, OpenClaw, and Kimi are unavailable UI previews; no executable adapters are registered for them.

Discovery runs only while the app is open. Worker execution pauses after restarting the app. Test results are agent reports plus inspectable command logs, not a general test certification system. Worktrees are not security sandboxes. The app is unsigned and requires an installed Node 22+ and the relevant authenticated CLIs.
