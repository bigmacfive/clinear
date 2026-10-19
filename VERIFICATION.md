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

- Published the reviewed demo report through the native app, read it back from GitHub, and observed the card move to Done with “Published and verified.” A separate GitHub API read confirmed exactly one report comment: https://github.com/bigmacfive/clinear-dispatch-demo/issues/1#issuecomment-6276165490

## Limits

Composio has an implemented session/OAuth/proxy and verified-publication path, but no Composio key was supplied, so **Composio live authentication and calls are not verified**. The GitHub CLI fallback is clearly labelled and is not sponsor integration evidence.

Claude is optional and was not used for implementation. Hermes, OpenClaw, and Kimi are unavailable UI previews; no executable adapters are registered for them.

Discovery runs only while the app is open. Worker execution pauses after restarting the app. Test results are agent reports plus inspectable command logs, not a general test certification system. Worktrees are not security sandboxes. The app is unsigned and requires an installed Node 22+ and the relevant authenticated CLIs.

### Connection verification controls

Connections now provides live Parallel and Composio checks. Parallel searches official Node.js test runner documentation through the configured API key or public MCP. Composio checks GitHub `/user` through its SDK proxy, even when the app's selected publishing route is the gh fallback. A unit test verifies fallback isolation and rejection of malformed account responses. Account login, project API key, and GitHub OAuth are still required for the first real Composio check; no successful Composio call is claimed yet.

### Workspace UX refinement

- Added shared custom comboboxes, text-field styling, sidebar/detail/dialog resizing, focused issue view, execution/event filters, diff file navigation, and card-scoped draft persistence with save-before-run/publish.
- Native macOS inspection: actual two-card demo board, 480→600px pointer resize, focused Changes view and real repository diff. Browser inspection: settings sections, dropdown open/close, Escape preserving the parent dialog, keyboard model selection.
- Build/typecheck and 19 backend regression tests passed. Exact 1024×768 / 1280×800 / 1440×900 viewport matrix and injected frontend save-failure scenarios have not yet been completed; no full accessibility conformance claim.
- Cline API: real `@cline/agents` call using `anthropic/claude-sonnet-5.5` completed and returned the requested JSON. Key is held only in the local 0600 secrets file. Parallel public MCP was verified earlier; Composio OAuth remains pending.
- Final restart check exposed a stalled proto Node shim. The macOS launcher now prefers installed Node executables under `.local/bin` / `.hermes/node/bin` and system locations before the proto shim; `CLINEAR_NODE` remains the explicit override.
- Restart recovery confirmed after adding an engine-local package manifest and installing the bundle at `~/Applications/Clinear.app`: native window reports “Local engine connected” and restores all 4 cards. Desktop shortcut points to this installed copy. Temporary bridge tracing was removed.

## Board drag and constrained workspace follow-up

- Replaced fixed toolbar height with intrinsic sizing and main-container breakpoints; footer compacts when the detail panel consumes board width.
- Added source feedback, permitted-column highlights, explanatory restricted targets, and animation-frame edge scrolling. Running/Done remain explicit execution/publication actions.
- Card movement uses pointer capture with a 6px threshold, Escape/cancel handling, and click suppression after dragging; native HTML dragging proved unreliable in the macOS verification session. Tauri file-drop interception is disabled.
- `npm test`: 21 tests pass, including board transition-policy tests. `npm run bundle`: TypeScript, Vite, engine packaging and release Rust compilation pass.
- Native visual check with a 600px detail panel confirms toolbar/column headers no longer overlap and footer no longer wraps.
- Final installed native app: dragged CL-003 Backlog → Ready, attempted Ready → Running (no move/no execution), then restored Ready → Backlog. Click after dragging did not open a detail panel; ordinary card click still opened it.
- Final screenshot: `artifacts/board-responsive-fixed.png`. Full viewport matrix and sustained edge-scroll speed have not been manually measured.

## Smooth pointer dragging

- Added a pointer-following card preview, preserving the grab offset. Its transform updates once per animation frame without re-rendering the board for every pointer event.
- Removed layout-changing column instructions; destination guidance is attached to the floating preview. The source retains its space.
- Edge scrolling uses a quadratic speed curve and gradual acceleration. Hit testing repeats during scrolling and at release, including a stationary pointer.
- Pointer cancellation, Escape, window blur and component cleanup remove the preview and listeners.
- TypeScript and all 21 tests pass.
- Removed the successful-move banner on user request; failed RPCs still surface through the existing error handler.
- Release bundle compiled successfully. In the updated native app, the board reflected a user-driven CL-002 move from Review to Ready. Sustained drag frame rate has not been benchmarked.

## Persistent card ordering and insertion preview

- `moveCard` atomically saves destination-column ranks in SQLite. Existing unranked cards retain creation order; new cards append after ranked cards.
- Same-column reorder is allowed in all stages. Cross-column moves continue to reject entering Running/Done or moving an active operation.
- Pointer hit testing selects the next visible card by its vertical midpoint; an overlay line marks insertion without shifting card layout. Filtering preserves hidden cards and uses the visible next card as the insertion anchor.
- TypeScript and 22 tests pass, including same-column reorder, cross-column insertion, stale anchor rejection without partial writes, persisted ordering read from a reopened store, and execution-state guards.
- Release macOS bundle built and installed. Native app reconnected successfully. Additional same-column mouse verification was not completed because the user was actively changing the board and editing Connections; their interaction was left undisturbed.
