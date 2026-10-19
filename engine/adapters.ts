import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import type { AgentId, AgentStatus } from "../src/types.js";
export const agentIds: Exclude<AgentId, "cline">[] = ["claude", "codex", "grok"];
export function detect(id: AgentId, override = ""): AgentStatus {
  const candidates = [
    override,
    ...(process.env.PATH || "").split(":").map((p) => `${p}/${id}`),
    `${homedir()}/.local/bin/${id}`,
    `${homedir()}/.${id}/bin/${id}`,
    ...(id === "codex"
      ? [
          "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
        ]
      : []),
  ].filter(Boolean);
  const path =
    candidates.find((p) => {
      try {
        accessSync(p, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    }) || "";
  return {
    id,
    path,
    installed: !!path,
    auth: "unverified",
    detail: path
      ? "Installed · authentication not tested"
      : "Executable not found",
  };
}
export function argsFor(
  id: AgentId,
  prompt: string,
  cwd: string,
  probe = false,
  reviewOnly = false,
): string[] {
  if (id === "claude")
    return [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "dontAsk",
      "--tools",
      probe ? "" : "Read,Edit,Write,Bash,Glob,Grep",
      "--allowedTools",
      ...(probe ? ["Read"] : ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]),
    ];
  if (id === "codex")
    return [
      "exec",
      ...(probe ? ["--skip-git-repo-check"] : []),
      "--json",
      "--color",
      "never",
      "--sandbox",
      probe ? "read-only" : "workspace-write",
      "-C",
      cwd,
      prompt,
    ];
  return [
    "-p",
    prompt,
    "--cwd",
    cwd,
    "--output-format",
    "streaming-json",
    "--permission-mode",
    "dontAsk",
    ...(probe || reviewOnly
      ? ["--tools", ""]
      : [
          "--tools",
          "read_file,list_dir,grep,search_replace,write,run_terminal_command",
          "--rules",
          "This local workboard task uses only the supplied repository and local built-in tools. Do not invoke external memory, MCP services, web search, or publishing tools. If unavailable tools are required, report BLOCKED: and stop.",
          "--allow",
          "Read",
          "--allow",
          "Grep",
          "--allow",
          "Edit",
          "--allow",
          "Bash(git *)",
          "--allow",
          "Bash(npm test*)",
          "--allow",
          "Bash(node --test*)",
          "--allow", "Bash(echo *)",
          "--allow", "Bash(pwd)",
          "--allow", "Bash(ls *)",
          "--allow", "Bash(cat *)",
          "--allow", "Bash(rg *)",
          "--deny", "Bash(git push*)",
          "--deny", "Bash(git reset*)",
          "--deny", "Bash(git clean*)",
        ]),
    "--no-subagents",
  ];
}
export interface Normalized {
  type: string;
  text: string;
  failure?: boolean;
}
export function normalize(id: AgentId, line: string): Normalized[] {
  if (!line.trim()) return [];
  let e: any;
  try {
    e = JSON.parse(line);
  } catch {
    return [{ type: "log", text: line.slice(0, 12000) }];
  }
  if (id === "grok" && e.type === "text" && typeof e.data === "string")
    return [{ type: "delta", text: e.data }];
  if (id === "grok" && e.type === "available_commands") return [];
  if (id === "grok" && e.type === "usage") return [];
  if (id === "grok" && e.type === "thought") return [];
  if (id === "grok" && e.type === "end")
    return [
      {
        type: "system",
        text: `Grok finished: ${e.stopReason || "complete"}`,
        failure: ["error", "cancelled", "canceled", "max_turns", "max_tokens"].includes(e.stopReason),
      },
    ];
  if (id === "grok" && ["tool_call", "tool_call_update"].includes(e.type))
    return [{ type: "tool", text: [e.title || e.toolName || e.toolCallId, e.status, e.rawInput && JSON.stringify(e.rawInput), ...(e.content || []).map((c: any) => c.content?.text || "")].filter(Boolean).join("\n").slice(-16000) }];
  if (e.type === "result")
    return [
      {
        type: e.is_error ? "error" : "result",
        text: typeof e.result === "string" ? e.result : JSON.stringify(e),
        failure: !!e.is_error,
      },
    ];
  if (e.type === "error" || e.type === "turn.failed")
    return [
      {
        type: "error",
        text: e.message || e.error?.message || JSON.stringify(e),
        failure: true,
      },
    ];
  if (id === "codex" && e.item) {
    const i = e.item;
    return [
      {
        type:
          i.type === "error"
            ? "warning"
            : i.type === "command_execution"
            ? "command"
            : i.type === "file_change"
              ? "file"
              : "message",
        text:
          i.text || i.message ||
          [
            i.command,
            i.aggregated_output,
            i.changes && JSON.stringify(i.changes),
          ]
            .filter(Boolean)
            .join("\n") ||
          JSON.stringify(i),
        failure: false,
      },
    ];
  }
  if (e.type === "assistant" && e.message?.content)
    return e.message.content.map((c: any) => ({
      type: c.type === "tool_use" ? "tool" : "message",
      text: c.text || `${c.name}: ${JSON.stringify(c.input)}`,
    }));
  const u = e.update || e.params?.update || e;
  if (u.content?.text) return [{ type: "message", text: u.content.text }];
  if (u.sessionUpdate === "tool_call" || u.sessionUpdate === "tool_call_update")
    return [{ type: "tool", text: JSON.stringify(u) }];
  if (
    e.type === "system" ||
    e.type === "thread.started" ||
    e.type === "turn.started"
  )
    return [
      {
        type: "system",
        text:
          e.type === "thread.started"
            ? `Session ${e.thread_id}`
            : e.subtype || e.type,
      },
    ];
  if (e.type === "turn.completed")
    return [{ type: "system", text: "Agent turn completed." }];
  return [{ type: "event", text: JSON.stringify(e).slice(0, 12000) }];
}
export function start(
  id: AgentId,
  path: string,
  prompt: string,
  cwd: string,
  onLine: (line: string) => void,
  onErr: (line: string) => void,
  probe = false,
  reviewOnly = false,
): ChildProcess {
  const env = { ...process.env };
  // App integration keys must not override each CLI's existing signed-in account.
  for (const key of [
    "ANTHROPIC_API_KEY",
    "CLINE_API_KEY",
    "COMPOSIO_API_KEY",
    "PARALLEL_API_KEY",
  ])
    delete env[key];
  const child = spawn(path, argsFor(id, prompt, cwd, probe, reviewOnly), {
    cwd,
    env,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stream = (
    s: NodeJS.ReadableStream | null,
    fn: (line: string) => void,
  ) => {
    let buffer = "";
    s?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      let n;
      while ((n = buffer.indexOf("\n")) >= 0) {
        fn(buffer.slice(0, n));
        buffer = buffer.slice(n + 1);
      }
      if (buffer.length > 100000) {
        fn(buffer.slice(0, 100000));
        buffer = "";
      }
    });
    s?.on("end", () => {
      if (buffer) fn(buffer);
    });
  };
  stream(child.stdout, onLine);
  stream(child.stderr, onErr);
  return child;
}
export function cancel(child: ChildProcess) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  const timer = setTimeout(() => {
    try {
      process.kill(-child.pid!, "SIGKILL");
    } catch {}
  }, 1500);
  timer.unref();
}
export function git(cwd: string, args: string[]) {
  const r = spawnSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw new Error(r.stderr || r.error?.message || "Git command failed");
  return r.stdout.trim();
}
