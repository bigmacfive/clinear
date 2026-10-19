import { Select } from "./Controls";
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
import { Modal, AgentIcon, names, upcomingAgents, UpcomingAgent } from "./ui";
import { desktop, rpc, openExternal } from "./api";
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
            <Select
              value={v.agent}
              onChange={(e) => setV({ ...v, agent: e.target.value as AgentId })}
            >
              {Object.entries(names).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
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
