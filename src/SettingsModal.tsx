import { useState } from "react";
import { Select } from "./Controls";
import {
  Check,
  Terminal,
  Loader2,
  Play,
  Link2,
  ArrowUpRight,
  Github,
} from "lucide-react";
import { Modal, AgentIcon, names, upcomingAgents, UpcomingAgent } from "./ui";
import { desktop, rpc, openExternal } from "./api";
import type { Snapshot, AgentId } from "./types";
export function SettingsModal({
  data,
  close,
  busy,
  save,
  probe,
  connect,
}: {
  data: Snapshot;
  close: () => void;
  busy: string[];
  save: (v: any) => void;
  probe: (id: AgentId) => void;
  connect: () => void;
}) {
  const [paths, setPaths] = useState({
    claudePath: data.agents[0]?.path || "",
    codexPath: data.agents[1]?.path || "",
    grokPath: data.agents[2]?.path || "",
  });
  const [section, setSection] = useState("agents");
  const [settingsError, setSettingsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState("");
  const [connectionResult, setConnectionResult] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [model, setModel] = useState(data.settings.model);
  const [provider, setProvider] = useState(data.settings.provider);
  const [githubTransport, setGithubTransport] = useState(
    data.settings.githubTransport,
  );
  return (
    <Modal title="Connections & settings" close={close} wide>
      <div className="settings-content">
        <div className="settings-navigation">
          {[
            ["agents", "Local agents"],
            ["research", "Research & planning"],
            ["github", "GitHub"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                setSettingsError("");
                setConnectionResult("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div hidden={section !== "agents"}>
          <div className="settings-section-title">
            <Terminal size={16} />
            <div>
              <h3>Local teammates</h3>
              <p>
                Use your installed CLIs and their existing login. Test with a
                real, read-only response.
              </p>
            </div>
          </div>
          {data.agents.map((a) => (
            <div className="connection-row" key={a.id}>
              <AgentIcon id={a.id} />
              <div className="connection-main">
                <strong>
                  {names[a.id]}
                  <span
                    className={`flag ${a.auth === "verified" ? "succeeded" : ""}`}
                  >
                    {a.auth === "verified"
                      ? "Verified"
                      : a.installed
                        ? "Installed · unverified"
                        : "Not found"}
                  </span>
                </strong>
                <input
                  aria-label={`${names[a.id]} executable`}
                  value={paths[`${a.id}Path`]}
                  onChange={(e) =>
                    setPaths({ ...paths, [`${a.id}Path`]: e.target.value })
                  }
                />
                {a.auth === "failed" && (
                  <small className="inline-error">{a.detail}</small>
                )}
              </div>
              <button
                className="secondary compact"
                disabled={!a.installed || busy.includes(`probe-${a.id}`)}
                onClick={() => probe(a.id)}
              >
                {busy.includes(`probe-${a.id}`) ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <Play size={12} />
                )}
                Test
              </button>
            </div>
          ))}
          <div className="upcoming-settings-title">
            More teammates, soon <span>Not yet available</span>
          </div>
          {upcomingAgents.map((agent) => (
            <UpcomingAgent key={agent.id} agent={agent} variant="connection" />
          ))}
        </div>
        <div hidden={section === "agents"}>
          <div className="settings-section-title integrations-title">
            <Link2 size={16} />
            <div>
              <h3>
                {section === "github"
                  ? "GitHub connection"
                  : "Research & planning"}
              </h3>
              <p>
                Keys stay in the local engine. Saved credentials are never
                returned to this interface.
              </p>
            </div>
          </div>
          {[
            {
              name: "Cline",
              label:
                provider === "local-codex"
                  ? "Cline SDK · local Codex inference"
                  : "Planning & orchestration",
              key: provider === "cline" ? "CLINE_API_KEY" : "ANTHROPIC_API_KEY",
              ready: data.integrations.cline,
            },
            {
              name: "Parallel",
              label: "Research · free MCP or API key",
              key: "PARALLEL_API_KEY",
              ready: data.integrations.parallel,
            },
            {
              name: "Composio",
              label: "GitHub authentication & actions",
              key: "COMPOSIO_API_KEY",
              ready: data.integrations.composio,
            },
          ]
            .filter((i) =>
              section === "github"
                ? i.name === "Composio"
                : i.name !== "Composio",
            )
            .map((i) => (
              <div className="integration-row" key={i.name}>
                <div>
                  <strong>
                    {i.name === "Cline" && <AgentIcon id="cline" small />}
                    {i.name}
                    <span className="credential-state">
                      {i.name === "Parallel" && !i.ready
                        ? "Public MCP available"
                        : i.ready
                          ? "Configured · test to verify"
                          : "Not configured"}
                    </span>
                  </strong>
                  <small>{i.label}</small>
                </div>
                <input
                  type="password"
                  aria-label={i.key}
                  autoComplete="off"
                  disabled={i.name === "Cline" && provider === "local-codex"}
                  placeholder={
                    i.name === "Cline" && provider === "local-codex"
                      ? "Using existing Codex login"
                      : i.ready
                        ? "Key configured · enter to replace"
                        : i.key
                  }
                  value={secrets[i.key] || ""}
                  onChange={(e) =>
                    setSecrets({ ...secrets, [i.key]: e.target.value })
                  }
                />
              </div>
            ))}
          <div className="github-connection">
            <button
              hidden={section !== "github"}
              className="secondary"
              onClick={() =>
                void openExternal("https://dashboard.composio.dev")
              }
            >
              Composio account & API key <ArrowUpRight size={14} />
            </button>
            {(["cline", "parallel", "composio"] as const)
              .filter((id) =>
                section === "github" ? id === "composio" : id !== "composio",
              )
              .map((id) => (
                <button
                  key={id}
                  className="secondary"
                  disabled={
                    !desktop ||
                    !!checking ||
                    (id === "composio" && !data.integrations.composio)
                  }
                  onClick={async () => {
                    setChecking(id);
                    setConnectionResult("");
                    try {
                      const result = await rpc<{ message: string }>(
                        "verifyIntegration",
                        { provider: id },
                      );
                      setConnectionResult(result.message);
                    } catch {
                      setConnectionResult(
                        `${id === "cline" ? "Cline" : id === "parallel" ? "Parallel" : "Composio"} verification failed. Save your key and complete account authorization, then retry.`,
                      );
                    } finally {
                      setChecking("");
                    }
                  }}
                >
                  {checking === id
                    ? "Testing…"
                    : `Test ${id === "cline" ? "Cline" : id === "parallel" ? "Parallel" : "Composio"}`}
                </button>
              ))}
          </div>
          <p className="settings-footnote" role="status">
            {connectionResult ||
              "Parallel public MCP needs no key. Composio: save API key → Connect GitHub → Test Composio → select Composio route and save."}
          </p>
          <div hidden={section !== "research"}>
            <div className="form-grid">
              <div>
                <label className="field-label">Cline model provider</label>
                <Select
                  aria-label="Cline model provider"
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    if (e.target.value === "cline")
                      setModel("anthropic/claude-sonnet-5.5");
                    else if (e.target.value === "anthropic")
                      setModel("claude-sonnet-4-6");
                  }}
                >
                  <option value="local-codex">Cline + local Codex login</option>
                  <option value="anthropic">Anthropic API</option>
                  <option value="cline">Cline</option>
                </Select>
              </div>
              <div>
                <label className="field-label">Model ID</label>
                <input
                  disabled={provider === "local-codex"}
                  value={
                    provider === "local-codex"
                      ? "Existing Codex default model"
                      : model
                  }
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div hidden={section !== "github"}>
            <label className="field-label">GitHub connection route</label>
            <Select
              aria-label="GitHub connection route"
              value={githubTransport}
              onChange={(e) =>
                setGithubTransport(e.target.value as "gh" | "composio")
              }
            >
              <option value="composio">Composio · connected account</option>
              <option value="gh">
                GitHub CLI · existing gh login (demo fallback)
              </option>
            </Select>
            <div className="github-connection">
              <Github size={20} />
              <div>
                <strong>Connect your GitHub account</strong>
                <small>
                  Authorize access through Composio’s secure connection page.
                </small>
              </div>
              <button
                className="secondary"
                disabled={!data.integrations.composio || !!checking}
                onClick={async () => {
                  setSettingsError("");
                  setChecking("connect");
                  try {
                    const r = await rpc<{ url: string }>("connectGithub");
                    await openExternal(r.url);
                    setConnectionResult(
                      "Authorization opened. Complete GitHub consent, then Test Composio.",
                    );
                  } catch {
                    setSettingsError(
                      "Could not open GitHub authorization. Check your saved Composio key and retry.",
                    );
                  } finally {
                    setChecking("");
                  }
                }}
              >
                Connect
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
        {settingsError && (
          <p className="inline-error" role="alert">
            {settingsError}
          </p>
        )}
        <p className="settings-footnote">
          Runtime: {data.settings.nodePath || "Desktop app required"}
          <br />
          Credentials are stored in a local file readable only by your user. CLI
          permissions still apply; worktrees are not security sandboxes.
        </p>
      </div>
      <footer className="modal-footer">
        <button className="secondary" onClick={close}>
          Close
        </button>
        <button
          className="primary"
          disabled={saving || !desktop}
          onClick={async () => {
            setSaving(true);
            setSettingsError("");
            try {
              await rpc("settings", {
                ...paths,
                model,
                provider,
                githubTransport,
                secrets,
              });
              setSecrets({});
              setConnectionResult(
                "Settings saved. Run a connection test to verify access.",
              );
            } catch {
              setSettingsError(
                "Settings could not be saved. Your entries are preserved; retry.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Check size={15} />
          Save settings
        </button>
      </footer>
    </Modal>
  );
}
