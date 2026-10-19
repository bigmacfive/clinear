import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderGit2,
  ArrowRight,
  Loader2,
  Github,
  Terminal,
  Play,
  Link2,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { Modal, AgentIcon, names } from "./ui";
import { desktop } from "./api";
import type { Card, AgentId, Snapshot } from "./types";
export function ProjectModal({
  close,
  onSubmit,
  busy,
}: {
  close: () => void;
  onSubmit: (v: { name: string; path: string }) => void;
  busy: boolean;
}) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal title="Connect a repository" close={close}>
      <p className="modal-description">
        Choose a trusted local Git repository with at least one commit. Agents
        work in separate branches; your current checkout stays intact.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, path });
        }}
      >
        <label className="field-label">Repository path</label>
        <div className="input-row">
          <input
            required
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/projects/my-app"
          />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              void open({ directory: true, multiple: false })
                .then((p) => {
                  if (p) {
                    setPath(p);
                    if (!name) setName(p.split("/").pop() || "Project");
                  }
                })
                .catch((e) => setErr(String(e)));
            }}
          >
            Browse
          </button>
        </div>
        <label className="field-label">Project name</label>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Engineering"
        />
        {err && <p className="inline-error">{err}</p>}
        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy || !desktop}>
            <FolderGit2 size={15} />
            Connect repository
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function IssueModal({
  card,
  project,
  cards,
  close,
  onSubmit,
  busy,
}: {
  card?: Card;
  project: boolean;
  cards: Card[];
  close: () => void;
  onSubmit: (v: Partial<Card>) => void;
  busy: boolean;
}) {
  const [v, setV] = useState({
    title: card?.title || "",
    description: card?.description || "",
    acceptance: card?.acceptance || "",
    owner: card?.owner || "You",
    agent: card?.agent || "codex",
    issueUrl: card?.issueUrl || "",
    dependencies: card?.dependencies || [],
  });
  return (
    <Modal title={card ? "Edit issue" : "New issue"} close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(v);
        }}
      >
        <label className="field-label">Title</label>
        <input
          autoFocus
          required
          placeholder="What needs to get done?"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
        />
        <label className="field-label">Description</label>
        <textarea
          rows={4}
          placeholder="Give your teammate the context they need…"
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
        <label className="field-label">Acceptance criteria</label>
        <textarea
          rows={2}
          placeholder="How will you know this is done?"
          value={v.acceptance}
          onChange={(e) => setV({ ...v, acceptance: e.target.value })}
        />
        <div className="form-grid">
          <div>
            <label className="field-label">Agent</label>
            <select
              value={v.agent}
              onChange={(e) => setV({ ...v, agent: e.target.value as AgentId })}
            >
              {Object.entries(names).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Human owner</label>
            <input
              value={v.owner}
              onChange={(e) => setV({ ...v, owner: e.target.value })}
            />
          </div>
        </div>
        <label className="field-label">GitHub issue URL · optional</label>
        <input
          type="url"
          placeholder="https://github.com/owner/repo/issues/123"
          value={v.issueUrl}
          onChange={(e) => setV({ ...v, issueUrl: e.target.value })}
        />
        {cards.filter((c) => c.id !== card?.id).length > 0 && (
          <>
            <label className="field-label">Dependencies</label>
            <div className="dependency-picker">
              {cards
                .filter((c) => c.id !== card?.id)
                .map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={v.dependencies.includes(c.id)}
                      onChange={(e) =>
                        setV({
                          ...v,
                          dependencies: e.target.checked
                            ? [...v.dependencies, c.id]
                            : v.dependencies.filter((x) => x !== c.id),
                        })
                      }
                    />
                    CL-{c.number} · {c.title}
                  </label>
                ))}
            </div>
          </>
        )}
        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy || !project}>
            {card ? "Save changes" : "Create issue"}
            <ArrowRight size={14} />
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function ImportModal({
  close,
  onSubmit,
  busy,
}: {
  close: () => void;
  onSubmit: (url: string) => void;
  busy: boolean;
}) {
  const [url, setUrl] = useState("");
  return (
    <Modal title="Import from GitHub" close={close}>
      <p className="modal-description">
        The selected GitHub connection reads the issue using your account. Its
        description becomes shared context for your team.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(url);
        }}
      >
        <label className="field-label">Issue URL</label>
        <input
          autoFocus
          required
          type="url"
          placeholder="https://github.com/owner/repo/issues/123"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Github size={15} />
            )}
            Import issue
          </button>
        </footer>
      </form>
    </Modal>
  );
}
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
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [model, setModel] = useState(data.settings.model);
  const [provider, setProvider] = useState(data.settings.provider);
  const [githubTransport, setGithubTransport] = useState(
    data.settings.githubTransport,
  );
  return (
    <Modal title="Connections & settings" close={close} wide>
      <div className="settings-content">
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
        <div className="settings-section-title integrations-title">
          <Link2 size={16} />
          <div>
            <h3>The tools behind the work</h3>
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
        ].map((i) => (
          <div className="integration-row" key={i.name}>
            <div>
              <strong>
                {i.name}
                <span className={`live-dot ${i.ready ? "on" : ""}`} />
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
        <div className="form-grid">
          <div>
            <label className="field-label">Cline model provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="local-codex">Cline + local Codex login</option>
              <option value="anthropic">Anthropic API</option>
              <option value="cline">Cline</option>
            </select>
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
        <label className="field-label">GitHub connection route</label>
        <select
          value={githubTransport}
          onChange={(e) =>
            setGithubTransport(e.target.value as "gh" | "composio")
          }
        >
          <option value="composio">Composio · connected account</option>
          <option value="gh">
            GitHub CLI · existing gh login (demo fallback)
          </option>
        </select>
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
            disabled={!data.integrations.composio || busy.includes("connect")}
            onClick={connect}
          >
            Connect
            <ArrowUpRight size={14} />
          </button>
        </div>
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
          disabled={busy.includes("settings") || !desktop}
          onClick={() => {
            save({ ...paths, model, provider, githubTransport, secrets });
            setSecrets({});
          }}
        >
          <Check size={15} />
          Save settings
        </button>
      </footer>
    </Modal>
  );
}
