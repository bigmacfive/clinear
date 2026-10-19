# Clinear submission — October 19, 2026

**Clinear turns a GitHub issue into reviewed work—with your local AI team. You stay in control.**

For solo developers who currently copy context between research tools, coding agents, test logs, and GitHub.

## Product in one sentence

**Cline + Linear = Clinear:** an agentic kanban that brings human direction, local AI execution, and verifiable outcomes into one work queue.

Cline provides configurable model-backed planning, readiness checks, and backlog synthesis. Parallel supplies research with inspectable sources. Composio connects the GitHub issue and approved result. Clinear's scheduler coordinates the local workers; it does not attribute CLI dispatch or execution budgets to Cline.

## Evidence at a glance

| Evidence | Submission run |
| --- | --- |
| Input | Public intentional priority-ordering bug, imported through Composio |
| Research | Seven attached Parallel sources |
| Planning | Cline proposals, CL-006 through CL-008 |
| Implementation | Local Codex worktree; original failing test reproduced |
| Verification | Final run: 4/4 tests and `git diff --check` passed |
| Review | Grok inspected the diff and recorded output; it did not run tests independently |
| Publication | [Published through Composio and read back successfully](https://github.com/bigmacfive/clinear-dispatch-demo/issues/1#issuecomment-6278163935); CL-007 is Done |

## Demo provenance

This demo uses an **intentional bug**, real API calls, and real local execution. The fixture is public: [issue #1](https://github.com/bigmacfive/clinear-dispatch-demo/issues/1). The fresh submission workspace starts at commit `9258f0f` and uses branch `clinear/5-0af4ec19`. Existing completed work was preserved.

The new sequence imports the issue through Composio (CL-005), attaches seven Parallel sources, and uses Cline to propose implementation, regression coverage, and review (CL-006–008). Cline explicitly distinguishes the repository's higher-number priority convention from the opposite convention in some search results.

Codex first reproduced the failure, corrected the comparator, and added immutability and stable-tie tests. A test-task run used the failure marker when describing the **expected pre-fix failure**; Clinear conservatively blocked that run. Its record was retained. After feedback, a fresh verification run on the fixed worktree passed all four tests and `git diff --check` without modifying files.

Grok receives actual diff and recorded command output in evidence-only mode. It does not independently execute tests. After approval, Composio published the result and read it back successfully: [verified GitHub report](https://github.com/bigmacfive/clinear-dispatch-demo/issues/1#issuecomment-6278163935). Code is left locally; no PR or merge is performed.

The research-generated backlog scene belongs to a separate earlier discovery run and is labeled accordingly.

## Reproduce

Follow the root README for Node 22+, Rust, Tauri and local CLI setup. Configure Cline, Parallel and Composio in Connections, verify each live connection, then clone the sample repository to an accessible local directory. Import issue #1, research, plan, accept, and explicitly run the tasks in dependency order. Review the diff and report before publishing.

This is a single-user Mac prototype. Scheduled discovery runs only while the app is open. Agent status is never simulated; a detected CLI is not proof of authentication. Claude is optional, and Hermes/OpenClaw/Kimi remain locked previews.
