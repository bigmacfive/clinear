import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Snapshot } from "./types";
export const desktop = isTauri();
export async function rpc<T = unknown>(
  method: string,
  params: unknown = {},
): Promise<T> {
  if (!desktop)
    throw Error(
      "Open the Tauri desktop app to use local agents. Browser preview is read-only.",
    );
  return invoke<T>("request", {
    message: { id: crypto.randomUUID(), method, params },
  });
}
export async function subscribe(
  fn: (event: { event: string; data: any }) => void,
) {
  if (!desktop) return () => {};
  return listen<{ event: string; data: any }>("engine", (e) => fn(e.payload));
}
export async function openExternal(url: string) {
  if (!/^https:\/\//i.test(url)) throw Error("Only HTTPS links can be opened.");
  if (desktop) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
export const blank: Snapshot = {
  automations: [],
  projects: [],
  cards: [],
  runs: [],
  agents: ["claude", "codex", "grok"].map((id) => ({
    id: id as "claude" | "codex" | "grok",
    path: "",
    installed: false,
    auth: "unverified",
    detail: "Connect in the desktop app",
  })),
  settings: {
    githubTransport: "composio",
    nodePath: "",
    claudePath: "",
    codexPath: "",
    grokPath: "",
    composioUserId: "",
    composioAuthConfigId: "",
    model: "claude-sonnet-4-6",
    provider: "anthropic",
  },
  integrations: { cline: false, parallel: false, composio: false },
  runtime: { dataDir: "" },
};
