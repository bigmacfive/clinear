import { useBoardDrag, dropReason } from "./useBoardDrag";
import { useCardDrafts } from "./useCardDrafts";
import { SettingsModal } from "./SettingsModal";
import { DetailPanel, ResizeHandle, useStoredWidth, Select } from "./Controls";
import { AutopilotPanel } from "./AutopilotPanel";
import { useEffect, useState, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  FileCode2,
  GitBranch,
  Github,
  LayoutGrid,
  Link2,
  ListFilter,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  Terminal,
  Users,
  X,
  Zap,
} from "lucide-react";
import { blank, desktop, openExternal, rpc, subscribe } from "./api";
import {
  stages,
  type AgentId,
  type Card,
  type Snapshot,
  type RunEvent,
  type Proposal,
} from "./types";
import {
  names,
  AgentIcon,
  StatusIcon,
  Modal,
  upcomingAgents,
  UpcomingAgent,
} from "./ui";
import { ProjectModal, IssueModal, ImportModal } from "./Forms";
export default function App() {
  const edits = useCardDrafts();
  const [data, setData] = useState<Snapshot>(blank);
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState("");
  const [focused, setFocused] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useStoredWidth(
    "clinear-sidebar-width",
    225,
    180,
    320,
  );
  const [agentsOpen, setAgentsOpen] = useState(
    () => localStorage.getItem("clinear-agents-open") !== "false",
  );
  const [runFilter, setRunFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [wrapDiff, setWrapDiff] = useState(false);
  const [diffState, setDiffState] = useState("loading");
  const bodyRef = useRef<HTMLDivElement>(null);
  const followLogs = useRef(true);
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [diff, setDiff] = useState("");
  const [proposal, setProposal] = useState<Proposal[]>([]);
  const [connected, setConnected] = useState(false);
  const selectedRef = useRef(selected);
  const pendingRef = useRef(new Set<string>());
  const drag = useBoardDrag((id, stage) => {
    void act("move", async () => {
      await rpc("updateCard", { id, patch: { stage } });
    });
  });
  selectedRef.current = selected;
  useEffect(() => {
    setSelected("");
    setAgentFilter("all");
    setSearch("");
  }, [projectId]);
  const update = (s: Snapshot) => {
    setData(s);
    setConnected(true);
    setProjectId((p) => p || s.projects[0]?.id || "");
  };
  useEffect(() => {
    let alive = true;
    let off = () => {};
    void subscribe((e) => {
      if (!alive) return;
      if (e.event === "snapshot" || e.event === "ready") update(e.data);
      if (e.event === "activity" && e.data.cardId === selectedRef.current)
        setEvents((prev) => [...prev, e.data].slice(-600));
      if (e.event === "error") setError(e.data);
      if (e.event === "disconnected") {
        setError(
          "Local engine stopped. Restart Clinear; your saved work is safe.",
        );
        setConnected(false);
      }
    }).then((fn) => {
      if (alive) off = fn;
      else fn();
    });
    let attempts = 0;
    const load = () => {
      if (!desktop) return;
      rpc<Snapshot>("snapshot")
        .then((s) => {
          if (alive) update(s);
        })
        .catch((e) => {
          if (++attempts < 8) setTimeout(load, 800);
          else if (alive) setError(String(e));
        });
    };
    load();
    return () => {
      alive = false;
      off();
    };
  }, []);
  useEffect(() => {
    if (!selected) return;
    let alive = true;
    void rpc<RunEvent[]>("events", { cardId: selected })
      .then((value) => {
        if (alive) setEvents(value);
      })
      .catch(() => {});
    setDiffState("loading");
    void rpc<string>("diff", { id: selected })
      .then((value) => {
        if (alive) {
          setDiff(value);
          setDiffState("ready");
        }
      })
      .catch(() => {
        if (alive) setDiffState("failed");
      });
    return () => {
      alive = false;
    };
  }, [selected, data.runs]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modal) setModal("");
        else if (focused) setFocused(false);
        else setSelected("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("search")?.focus();
      }
      if (
        e.key === "n" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        setModal("new");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modal, focused]);
  useEffect(() => {
    if (tab === "Activity" && followLogs.current)
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [events, tab]);
  async function act<T = any>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    setError("");
    setPending((v) => [...v, key]);
    try {
      return await fn();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      return undefined;
    } finally {
      pendingRef.current.delete(key);
      setPending((v) => v.filter((x) => x !== key));
    }
  }
  const busy = (key: string) => pending.includes(key);
  const automation = data.automations.find((a) => a.projectId === projectId);
  const project = data.projects.find((p) => p.id === projectId);
  const allCards = data.cards.filter((c) => c.projectId === projectId);
  const cards = allCards.filter(
    (c) =>
      (agentFilter === "all" || c.agent === agentFilter) &&
      `${c.title} ${c.description} CL-${c.number}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const card = data.cards.find((c) => c.id === selected);
  const runs = data.runs.filter((r) => r.cardId === selected);
  const latest = runs.at(-1);
  const running = data.runs.filter((r) => r.status === "running").length;
  const select = (c: Card) => {
    bodyRef.current?.scrollTo({ top: 0 });
    followLogs.current = true;
    setRunFilter("all");
    setEventFilter("all");
    setSelected(c.id);
    setTab("Overview");
  };
  const saveCard = (patch: Partial<Card>) =>
    act("save", () => rpc("updateCard", { id: selected, patch }));
  const startCard = (c: Card) =>
    act("run", async () => {
      await edits.flush(c.id);
      return rpc("run", { id: c.id });
    });
  const link = (url: string) => void act("link", () => openExternal(url));
  return (
    <div
      className={`app-shell ${focused && card ? "focus-mode" : ""}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
    >
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <ResizeHandle
          width={sidebarWidth}
          setWidth={setSidebarWidth}
          min={180}
          max={320}
          side="right"
          label="Resize sidebar"
        />
        <div className="traffic-space" data-tauri-drag-region />
        <button
          className="workspace-switch"
          onClick={() => setModal("project")}
        >
          <span className="brand-mark">/</span>
          <strong>Clinear</strong>
          <span className="workspace-chevron">
            <ChevronDown size={14} />
          </span>
        </button>
        <div className="workspace-caption">
          PERSONAL WORKSPACE <span>LOCAL</span>
        </div>
        <nav>
          <button
            className="nav-item active"
            onClick={() => {
              setSelected("");
              setAgentFilter("all");
            }}
          >
            <LayoutGrid size={16} /> Workspace{" "}
            <span className="nav-count">{data.cards.length}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setSearch("");
              setAgentFilter("all");
              setNotice(
                "Select a card to inspect its live activity and run history.",
              );
            }}
          >
            <Activity size={16} /> Activity{" "}
            <span className={`live-dot ${running ? "on" : ""}`} />
          </button>
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Users size={16} /> Your team <span className="nav-count">6</span>
          </button>
        </nav>
        <div className="sidebar-section">
          <span>Projects</span>
          <button
            aria-label="Add project"
            className="icon-button"
            onClick={() => setModal("project")}
          >
            <Plus size={14} />
          </button>
        </div>
        {data.projects.map((p) => (
          <button
            key={p.id}
            className={`nav-item project-link ${projectId === p.id ? "selected" : ""}`}
            onClick={() => {
              setProjectId(p.id);
              setSelected("");
            }}
          >
            <span className="project-icon">
              <Code2 size={13} />
            </span>
            {p.name}
          </button>
        ))}
        {!data.projects.length && (
          <button className="add-project" onClick={() => setModal("project")}>
            <Plus size={14} /> Connect a repository
          </button>
        )}
        <button
          className="sidebar-section team-label"
          aria-expanded={agentsOpen}
          onClick={() => {
            setAgentsOpen(!agentsOpen);
            localStorage.setItem("clinear-agents-open", String(!agentsOpen));
          }}
        >
          Agents <ChevronDown size={14} />
        </button>
        {agentsOpen &&
          data.agents.map((a) => (
            <button
              className="agent-nav"
              key={a.id}
              onClick={() =>
                setAgentFilter(agentFilter === a.id ? "all" : a.id)
              }
            >
              <AgentIcon id={a.id} small />
              <span>
                {names[a.id]}
                {a.id === "claude" && (
                  <small className="optional-agent">optional</small>
                )}
              </span>
              <span
                className={`live-dot ${data.runs.some((r) => r.agent === a.id && r.status === "running") ? "working" : a.auth === "verified" ? "on" : ""}`}
              />
            </button>
          ))}
        <div className="sidebar-bottom">
          <div className="local-box">
            <span className={`live-dot ${connected ? "on" : ""}`} />
            <div>
              <strong>{desktop ? "Local workspace" : "Browser preview"}</strong>
              <small>
                {desktop
                  ? "Your code stays on your Mac"
                  : "Open the app to run agents"}
              </small>
            </div>
            <ShieldCheck size={15} />
          </div>
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Settings2 size={16} /> Connections & settings
          </button>
          <div className="profile">
            <span className="avatar">Y</span>
            <div>
              <strong>Your workspace</strong>
              <small>Human in the loop</small>
            </div>
            <span className="keycap">⌘ K</span>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar" data-tauri-drag-region>
          <div className="breadcrumbs">
            <span className="project-icon">
              <Code2 size={13} />
            </span>
            <span>{project?.name || "Workspace"}</span>
            <ChevronRight size={13} />
            <strong>All issues</strong>
          </div>
          <div className="topbar-right">
            <span className="local-chip">
              <span className={`live-dot ${connected ? "on" : ""}`} />
              {connected ? "Local engine connected" : "Local-first"}
            </span>
            <button
              className="icon-button"
              title="Connections"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </header>
        <div className="viewbar">
          <div className="view-tab">
            <LayoutGrid size={15} /> Board <span>{allCards.length}</span>
          </div>
          <div className="view-description">
            Shared context. Clear ownership.
          </div>
          <div className="view-actions">
            <button
              className="primary compact"
              onClick={() => setModal(project ? "new" : "project")}
            >
              <Plus size={14} />
              {project ? "New issue" : "Connect repository"}
            </button>
            {project && (
              <button
                className={`secondary compact autopilot-toggle ${automation?.enabled ? "active" : ""}`}
                onClick={() => setModal("autopilot")}
              >
                <Zap size={13} />
                {automation?.enabled ? "Autopilot on" : "Autopilot"}
              </button>
            )}
            <label className="search-box">
              <Search size={14} />
              <input
                id="search"
                aria-label="Search issues"
                placeholder="Search issues…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    document.getElementById("search")?.focus();
                  }}
                >
                  <X size={12} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </label>
            <Select
              className={`agent-filter ${agentFilter !== "all" ? "filtered" : ""}`}
              aria-label="Filter by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            >
              <option value="all">All agents</option>
              <option value="codex">Codex</option>
              <option value="grok">Grok Build</option>
              <option value="claude">Claude Code</option>
            </Select>
            <button
              className="secondary compact"
              onClick={() => setModal(project ? "import" : "project")}
            >
              <Github size={14} /> Import
            </button>
          </div>
        </div>
        {error && (
          <div className="alert error" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {notice && (
          <div className="alert" role="status">
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {!desktop && (
          <div className="preview-banner">
            <BookOpen size={14} /> Read-only interface preview. Run{" "}
            <code>npm run desktop</code> to connect your local agents.
          </div>
        )}
        {automation && (automation.enabled || automation.researchEnabled) && (
          <div className="automation-banner">
            <Zap size={13} />
            <span>{automation.lastMessage}</span>
            <button onClick={() => setModal("autopilot")}>
              {automation.runsUsed}/{automation.runBudget} runs · Manage
              <ChevronRight size={12} />
            </button>
          </div>
        )}
        <div className={`board-wrap ${drag.dragged ? "is-dragging" : ""}`} ref={drag.boardRef}>
          <div className="board">
            {stages.map((stage) => (
              <section
                className={`column ${stage.toLowerCase()} ${drag.dragged && !dropReason(drag.dragged.stage, stage) ? "drop-available" : ""} ${drag.over === stage ? "drop-over" : ""}`}
                key={stage}
                data-stage={stage}
              >
                <div className="column-heading">
                  <span className="stage-icon">
                    <StatusIcon stage={stage} />
                  </span>
                  <strong>{stage}</strong>
                  <span className="column-count">
                    {cards.filter((c) => c.stage === stage).length}
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => setModal(project ? "new" : "project")}
                    aria-label={`Add issue to ${stage}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <div className="column-cards">
                  {cards
                    .filter((c) => c.stage === stage)
                    .map((c) => (
                      <button
                        key={c.id}
                        draggable={false}
                        data-draggable={desktop && c.stage !== "Running" && !busy("move")}
                        onPointerDown={(e) => { if (desktop && c.stage !== "Running" && !busy("move")) drag.start(e, c); }}
                        className={`issue-card ${selected === c.id ? "chosen" : ""} ${drag.dragged?.id === c.id ? "drag-source" : ""}`}
                        onClick={() => select(c)}
                      >
                        <div className="issue-meta">
                          <span>CL-{String(c.number).padStart(3, "0")}</span>
                          {c.flag ? (
                            <span className={`flag ${c.flag}`}>{c.flag}</span>
                          ) : (
                            <MoreHorizontal size={14} />
                          )}
                        </div>
                        <h3>{c.title}</h3>
                        {c.stage === "Running" && (
                          <div className="running-line">
                            <Loader2 className="spin" size={12} />
                            Working in an isolated branch
                          </div>
                        )}
                        <div className="card-tags">
                          {c.origin === "research" && (
                            <span className="research-tag">
                              <Zap size={10} />
                              Discovered
                            </span>
                          )}
                          {c.reviewOf && (
                            <span>
                              <ShieldCheck size={10} />
                              Peer review
                            </span>
                          )}
                          {c.issueUrl && (
                            <span>
                              <Github size={10} />
                              GitHub
                            </span>
                          )}
                          {c.dependencies.length > 0 && (
                            <span>
                              <GitBranch size={10} />
                              {c.dependencies.length} dependencies
                            </span>
                          )}
                        </div>
                        <div className="card-footer">
                          <span className="card-agent">
                            <AgentIcon id={c.agent} small />
                            {names[c.agent]}
                          </span>
                          <span className="owner-avatar" title={c.owner}>
                            {c.owner.slice(0, 1).toUpperCase()}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
                {!cards.some((c) => c.stage === stage) && (
                  <div className="column-empty">
                    {stage === "Backlog"
                      ? "Ideas start here"
                      : stage === "Ready"
                        ? "Ready for a teammate"
                        : stage === "Running"
                          ? "Agents at work"
                          : stage === "Review"
                            ? "Your judgment matters"
                            : "Work worth shipping"}
                  </div>
                )}
                <button
                  className="column-add"
                  onClick={() => setModal(project ? "new" : "project")}
                >
                  <Plus size={13} /> Add issue
                </button>
              </section>
            ))}
          </div>
          {!allCards.length && (
            <div className="onboarding">
              <div className="onboarding-symbol">
                <GitBranch size={25} />
                <span>✦</span>
              </div>
              <h2>A home for work that actually gets done.</h2>
              <p>
                Give your agents context, assign a task, and review the result.
                <br />
                You stay in control from the first idea to the final change.
              </p>
              <div className="onboarding-actions">
                <button
                  className="primary"
                  onClick={() => setModal(project ? "new" : "project")}
                >
                  <Plus size={15} />
                  {project ? "Create your first issue" : "Connect a repository"}
                </button>
                <button
                  className="secondary"
                  disabled={busy("sample")}
                  onClick={() =>
                    void act("sample", async () => {
                      const p = await rpc<{ id: string }>("setupSample");
                      setProjectId(p.id);
                      setNotice(
                        "Sample repository created locally. These are real tasks; no agents have run yet.",
                      );
                    })
                  }
                >
                  {busy("sample") ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  Try a sample project
                </button>
              </div>
              <div className="workflow-hint">
                <span>
                  <Github size={13} /> Issue
                </span>
                <ArrowRight size={12} />
                <span>
                  <Search size={13} /> Research
                </span>
                <ArrowRight size={12} />
                <span>
                  <Terminal size={13} /> Execute
                </span>
                <ArrowRight size={12} />
                <span>
                  <CheckCheck size={13} /> Review
                </span>
              </div>
            </div>
          )}
        </div>
        <footer className="statusbar">
          <span>
            <span className="live-dot on" />
            Built for people and agents
          </span>
          <span>
            <span className="powered-cline">▰</span> Cline orchestration{" "}
            <span className="footer-separator">/</span> Parallel research{" "}
            <span className="footer-separator">/</span>{" "}
            {data.settings.githubTransport === "gh"
              ? "GitHub CLI · demo fallback"
              : "Composio connections"}
          </span>
          <span>
            v0.1.0 <span className="keycap">LOCAL</span>
          </span>
        </footer>
      </main>
      {card && (
        <DetailPanel focused={focused}>
          <header className="detail-top">
            <span>
              <StatusIcon stage={card.stage} /> CL-
              {String(card.number).padStart(3, "0")}
            </span>
            <div>
              <button
                className="secondary compact"
                onClick={() => setFocused(!focused)}
              >
                {focused ? "Back to board" : "Expand"}
              </button>
              {card.issueUrl && (
                <button
                  className="icon-button"
                  title="Open GitHub issue"
                  onClick={() => link(card.issueUrl)}
                >
                  <ExternalLink size={15} />
                </button>
              )}
              <button
                className="icon-button"
                aria-label="Close issue"
                onClick={() => setSelected("")}
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <div className="detail-title">
            <span className="eyebrow">
              {card.stage === "Running"
                ? "AGENT AT WORK"
                : card.stage === "Review"
                  ? "READY FOR YOUR REVIEW"
                  : "ISSUE DETAILS"}
            </span>
            <h2>{card.title}</h2>
            <div className="detail-properties">
              <span className={`status-badge ${card.stage.toLowerCase()}`}>
                <StatusIcon stage={card.stage} />
                {card.stage}
              </span>
              <span>
                <AgentIcon id={card.agent} small />
                {names[card.agent]}
              </span>
              <span>
                <span className="owner-avatar">{card.owner.slice(0, 1)}</span>
                {card.owner}
              </span>
            </div>
          </div>
          <div
            className="detail-tabs"
            role="tablist"
            aria-label="Issue details"
          >
            {["Overview", "Activity", "Changes", "Publish"].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const tabs = ["Overview", "Activity", "Changes", "Publish"];
                    const n =
                      (tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                    setTab(tabs[n]);
                    (
                      e.currentTarget.parentElement?.children[n] as HTMLElement
                    )?.focus();
                  }
                }}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
                {t === "Activity" && events.length > 0 && (
                  <span>{events.length}</span>
                )}
              </button>
            ))}
          </div>
          <div
            className="detail-body"
            ref={bodyRef}
            onScroll={(e) => {
              const n = e.currentTarget;
              followLogs.current =
                n.scrollHeight - n.scrollTop - n.clientHeight < 60;
            }}
          >
            {tab === "Overview" && (
              <>
                <label className="field-label">Description</label>
                {card.description.length > 700 ? (
                  <>
                    <p className="description-text">
                      {card.description.slice(0, 400)}…
                    </p>
                    <details key={card.id}>
                      <summary>Read full context</summary>
                      <p className="description-text">{card.description}</p>
                    </details>
                  </>
                ) : (
                  <p className="description-text">
                    {card.description || "No description yet."}
                  </p>
                )}
                <label className="field-label">Acceptance criteria</label>
                <p className="acceptance-box">
                  <Check size={14} />
                  <span>
                    {card.acceptance || "Define what done looks like."}
                  </span>
                </p>
                <div className="detail-actions">
                  {card.flag && (
                    <button
                      className="secondary compact"
                      onClick={() =>
                        void act("unblock", () =>
                          rpc("unblock", { id: card.id }),
                        )
                      }
                    >
                      <Check size={13} />
                      Mark ready
                    </button>
                  )}
                  <button
                    className="secondary compact"
                    disabled={card.stage === "Running"}
                    onClick={() => setModal("edit")}
                  >
                    Edit issue
                  </button>
                  <button
                    className="secondary compact"
                    disabled={busy("research") || card.stage === "Running"}
                    onClick={() =>
                      void act("research", () =>
                        rpc("research", { id: card.id }),
                      )
                    }
                  >
                    {busy("research") ? (
                      <Loader2 size={13} className="spin" />
                    ) : (
                      <Search size={13} />
                    )}
                    Research
                  </button>
                  <button
                    className="secondary compact"
                    disabled={busy("propose") || card.stage === "Running"}
                    onClick={() =>
                      void act("propose", async () => {
                        const p = await rpc<Proposal[]>("propose", {
                          id: card.id,
                        });
                        setProposal(p);
                        setModal("proposal");
                      })
                    }
                  >
                    {busy("propose") ? (
                      <Loader2 size={13} className="spin" />
                    ) : (
                      <Zap size={13} />
                    )}
                    Plan with Cline
                  </button>
                </div>
                {card.dependencies.length > 0 && (
                  <>
                    <label className="field-label">Depends on</label>
                    {card.dependencies.map((id) => {
                      const dep = data.cards.find((c) => c.id === id);
                      return (
                        dep && (
                          <button
                            className="dependency"
                            key={id}
                            onClick={() => select(dep)}
                          >
                            <StatusIcon stage={dep.stage} />
                            <span>CL-{dep.number}</span>
                            {dep.title}
                            <ArrowUpRight size={12} />
                          </button>
                        )
                      );
                    })}
                  </>
                )}
                {latest && (
                  <>
                    <label className="field-label">
                      Latest outcome{" "}
                      <span className={`flag ${latest.status}`}>
                        {latest.status}
                      </span>
                    </label>
                    <pre className="summary">
                      {latest.summary ||
                        "Waiting for the agent’s final report…"}
                    </pre>
                  </>
                )}
                {card.sources.length > 0 && (
                  <>
                    <details>
                      <summary>
                        Research · Parallel · {card.sources.length} sources
                      </summary>
                      {card.sources.map((s, i) => (
                        <button
                          className="source"
                          key={i}
                          onClick={() => link(s.url)}
                        >
                          <span className="source-number">{i + 1}</span>
                          <div>
                            <strong>{s.title}</strong>
                            <small>{new URL(s.url).hostname}</small>
                            <p>{s.excerpts[0]?.slice(0, 200)}</p>
                          </div>
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </details>
                  </>
                )}
                {card.worktree && (
                  <details>
                    <summary>Branch & workspace</summary>
                    <div className="branch-info">
                      <GitBranch size={14} />
                      <div>
                        <strong>{card.branch}</strong>
                        <small>{card.worktree}</small>
                      </div>
                    </div>
                  </details>
                )}
                <label className="field-label">Feedback for the next run</label>
                {card.stage === "Review" && (
                  <button
                    className="secondary compact"
                    disabled={busy("run")}
                    onClick={() => void startCard(card)}
                  >
                    Re-run with feedback
                  </button>
                )}
                <textarea
                  value={edits.drafts[card.id]?.feedback ?? card.feedback}
                  onChange={(e) =>
                    edits.edit(card.id, { feedback: e.target.value })
                  }
                  placeholder="What should your teammate adjust?"
                  rows={3}
                  onBlur={() => void act("save", () => edits.flush(card.id))}
                  disabled={card.stage === "Running"}
                />
              </>
            )}
            {tab === "Activity" && (
              <>
                <div className="section-heading">
                  <Activity size={14} />
                  <strong>Execution timeline</strong>
                  <span>{runs.length} runs</span>
                </div>
                <div className="log-filters">
                  <Select
                    aria-label="Execution run"
                    value={runFilter}
                    onChange={(e) => setRunFilter(e.target.value)}
                  >
                    <option value="all">All runs</option>
                    {runs.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        Run {i + 1} · {r.status}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Event type"
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                  >
                    <option value="all">All events</option>
                    {[...new Set(events.map((e) => e.type))].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                {events.length === 0 ? (
                  <div className="empty-detail">
                    <Terminal size={28} />
                    <h3>No activity yet</h3>
                    <p>
                      Research, planning, and agent execution will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="timeline">
                    {events
                      .filter(
                        (e) =>
                          (runFilter === "all" || e.runId === runFilter) &&
                          (eventFilter === "all" || e.type === eventFilter),
                      )
                      .map((e) => (
                        <div className={`timeline-event ${e.type}`} key={e.id}>
                          <span className="timeline-dot" />
                          <div className="event-heading">
                            <strong>{e.type}</strong>
                            <time>
                              {new Date(e.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </time>
                          </div>
                          <pre>{e.text}</pre>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
            {tab === "Changes" && (
              <>
                <div className="section-heading">
                  <FileCode2 size={14} />
                  <strong>Working tree diff</strong>
                  <button
                    className="text-button"
                    onClick={() =>
                      void act("diff", async () => {
                        setDiffState("loading");
                        try {
                          setDiff(await rpc<string>("diff", { id: card.id }));
                          setDiffState("ready");
                        } catch (e) {
                          setDiffState("failed");
                          throw e;
                        }
                      })
                    }
                  >
                    Refresh
                  </button>
                </div>
                <div className="diff-tools">
                  <label>
                    <input
                      type="checkbox"
                      checked={wrapDiff}
                      onChange={(e) => setWrapDiff(e.target.checked)}
                    />{" "}
                    Wrap lines
                  </label>
                  <Select
                    aria-label="Jump to changed file"
                    value=""
                    onChange={(e) =>
                      document
                        .getElementById(`diff-line-${e.target.value}`)
                        ?.scrollIntoView({ block: "start" })
                    }
                  >
                    <option value="">Jump to file…</option>
                    {diff.split("\n").flatMap((line, i) =>
                      line.startsWith("diff --git ")
                        ? [
                            <option key={i} value={String(i)}>
                              {line.split(" b/").at(-1)}
                            </option>,
                          ]
                        : [],
                    )}
                  </Select>
                </div>
                {diffState === "loading" ? (
                  <p role="status">Loading changes…</p>
                ) : diffState === "failed" ? (
                  <p role="alert">Could not load changes. Refresh to retry.</p>
                ) : diff ? (
                  <pre className={`diff ${wrapDiff ? "wrap" : ""}`}>
                    {diff.split("\n").map((line, i) => (
                      <div
                        key={i}
                        id={`diff-line-${i}`}
                        className={
                          line.startsWith("+")
                            ? "added"
                            : line.startsWith("-")
                              ? "removed"
                              : line.startsWith("@@")
                                ? "hunk"
                                : ""
                        }
                      >
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <div className="empty-detail">
                    <FileCode2 size={28} />
                    <h3>No changes yet</h3>
                    <p>
                      Actual repository changes appear here after a worker runs.
                    </p>
                  </div>
                )}
              </>
            )}
            {tab === "Publish" && (
              <>
                <div className="publish-intro">
                  <ShieldCheck size={23} />
                  <h3>Your review is the final step.</h3>
                  <p>
                    Review the diff and test report, then publish a verified
                    comment to the linked GitHub issue. Code remains on your
                    local branch.
                  </p>
                </div>
                <button
                  className="secondary compact"
                  disabled={busy("draft")}
                  onClick={() =>
                    void act("draft", async () => {
                      await edits.flush(card.id);
                      return rpc("draftComment", { id: card.id });
                    })
                  }
                >
                  <MessageSquare size={14} />
                  Generate report draft
                </button>
                <label className="field-label">GitHub comment · editable</label>
                <textarea
                  className="comment-editor"
                  value={
                    edits.drafts[card.id]?.commentDraft ?? card.commentDraft
                  }
                  onChange={(e) =>
                    edits.edit(card.id, { commentDraft: e.target.value })
                  }
                  rows={13}
                  placeholder="Generate a report or write your own…"
                  onBlur={() => void act("save", () => edits.flush(card.id))}
                />
                {!card.issueUrl && (
                  <p className="muted">
                    Link a GitHub issue in Edit issue to publish.
                  </p>
                )}
                {card.publishedUrl ? (
                  <button
                    className="success-link"
                    onClick={() => link(card.publishedUrl)}
                  >
                    <CheckCheck size={15} />
                    Verified on GitHub
                    <ArrowUpRight size={14} />
                  </button>
                ) : (
                  <button
                    className="primary full"
                    title={
                      card.stage !== "Review"
                        ? "Complete a run before publishing"
                        : !card.issueUrl
                          ? "Link a GitHub issue first"
                          : !(
                                edits.drafts[card.id]?.commentDraft ??
                                card.commentDraft
                              )
                            ? "Write or generate a report first"
                            : "Approve this report and post it to GitHub"
                    }
                    disabled={
                      card.stage !== "Review" ||
                      !card.issueUrl ||
                      !(
                        edits.drafts[card.id]?.commentDraft ?? card.commentDraft
                      ) ||
                      busy("publish")
                    }
                    onClick={() =>
                      void act("publish", async () => {
                        const body =
                          edits.drafts[card.id]?.commentDraft ??
                          card.commentDraft;
                        await edits.flush(card.id);
                        return rpc("publish", { id: card.id, body });
                      })
                    }
                  >
                    {busy("publish") ? (
                      <Loader2 className="spin" size={15} />
                    ) : (
                      <CheckCheck size={15} />
                    )}
                    Approve & publish
                  </button>
                )}
              </>
            )}
          </div>
          <div className="save-status" role="status">
            {edits.status[card.id] ||
              (Object.keys(edits.drafts[card.id] || {}).length
                ? "Unsaved changes"
                : "All changes saved")}
            {edits.status[card.id]?.startsWith("Save failed") && (
              <button
                onClick={() => void act("save", () => edits.flush(card.id))}
              >
                Retry save
              </button>
            )}
          </div>
          <footer className="detail-footer">
            {card.stage === "Running" ? (
              <>
                <span>
                  <span className="live-dot working" />
                  Agent is working
                </span>
                <button
                  className="secondary"
                  onClick={() =>
                    void act("cancel", () => rpc("cancel", { id: card.id }))
                  }
                >
                  <Square size={12} />
                  Stop run
                </button>
              </>
            ) : card.stage === "Done" ? (
              <span className="done-label">
                <CheckCheck size={16} />
                Published and verified
              </span>
            ) : (
              <>
                <span>
                  {card.stage === "Review"
                    ? "Review before shipping"
                    : "Runs only when you say so"}
                </span>
                <button
                  className={tab === "Publish" ? "secondary" : "primary"}
                  title={
                    busy("save")
                      ? "Wait for changes to save"
                      : "Review or execute this issue"
                  }
                  disabled={busy("run")}
                  onClick={() =>
                    card.stage === "Review"
                      ? setTab(tab === "Changes" ? "Publish" : "Changes")
                      : void startCard(card)
                  }
                >
                  <Play size={14} />
                  {card.stage === "Review"
                    ? tab === "Changes"
                      ? "Review report"
                      : "Review changes"
                    : "Run agent"}
                </button>
              </>
            )}
          </footer>
        </DetailPanel>
      )}
      {modal === "autopilot" && automation && (
        <AutopilotPanel
          config={automation}
          close={() => setModal("")}
          busy={pending.some((k) =>
            ["automation", "discover", "autostart"].includes(k),
          )}
          save={(config) =>
            act("automation", () =>
              rpc("automationSettings", { projectId, config }),
            )
          }
          start={() =>
            void act("autostart", () => rpc("startAutopilot", { projectId }))
          }
          pause={() =>
            void act("autostop", () => rpc("pauseAutopilot", { projectId }))
          }
          research={() =>
            void act("discover", () => rpc("researchBacklog", { projectId }))
          }
        />
      )}
      {modal === "project" && (
        <ProjectModal
          close={() => setModal("")}
          busy={busy("project")}
          onSubmit={(v) =>
            void act("project", async () => {
              const p = await rpc<{ id: string }>("addProject", v);
              setProjectId(p.id);
              setModal("");
            })
          }
        />
      )}
      {(modal === "new" || modal === "edit") && (
        <IssueModal
          card={modal === "edit" ? card : undefined}
          project={!!project}
          cards={allCards}
          close={() => setModal("")}
          busy={busy("issue")}
          onSubmit={(v) =>
            void act("issue", async () => {
              if (!project) throw Error("Connect a repository first.");
              const c = await rpc<Card>(
                modal === "edit" ? "updateCard" : "createCard",
                modal === "edit"
                  ? { id: card?.id, patch: v }
                  : { ...v, projectId },
              );
              setSelected(c.id);
              setModal("");
            })
          }
        />
      )}
      {modal === "import" && (
        <ImportModal
          close={() => setModal("")}
          busy={busy("import")}
          onSubmit={(url) =>
            void act("import", async () => {
              const c = await rpc<Card>("importIssue", { projectId, url });
              setSelected(c.id);
              setModal("");
            })
          }
        />
      )}
      {modal === "settings" && (
        <SettingsModal
          data={data}
          close={() => setModal("")}
          busy={pending}
          save={(v) =>
            void act("settings", async () => {
              await rpc("settings", v);
              setNotice("Connection settings saved locally.");
            })
          }
          probe={(id) =>
            void act(`probe-${id}`, () => rpc("probe", { agent: id }))
          }
          connect={() =>
            void act("connect", async () => {
              const r = await rpc<{ url: string }>("connectGithub");
              await openExternal(r.url);
              setNotice(
                "Complete GitHub authorization in your browser, then import an issue.",
              );
            })
          }
        />
      )}
      {modal === "proposal" && (
        <Modal title="Cline’s proposed plan" close={() => setModal("")} wide>
          <p className="modal-description">
            Adjust the proposal, then add the steps to your board. You choose
            when each agent runs.
          </p>
          <div className="proposal-list">
            {proposal.map((p, i) => (
              <div className="proposal-item" key={i}>
                <span className="proposal-index">{i + 1}</span>
                <div>
                  <input
                    aria-label={`Step ${i + 1} title`}
                    value={p.title}
                    onChange={(e) =>
                      setProposal((prev) =>
                        prev.map((x, j) =>
                          i === j ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <textarea
                    rows={3}
                    value={p.description}
                    onChange={(e) =>
                      setProposal((prev) =>
                        prev.map((x, j) =>
                          i === j ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Step ${i + 1} acceptance criteria`}
                    value={p.acceptance}
                    onChange={(e) =>
                      setProposal((prev) =>
                        prev.map((x, j) =>
                          i === j ? { ...x, acceptance: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Select
                    value={p.agent}
                    onChange={(e) =>
                      setProposal((prev) =>
                        prev.map((x, j) =>
                          i === j
                            ? { ...x, agent: e.target.value as AgentId }
                            : x,
                        ),
                      )
                    }
                  >
                    {Object.entries(names).map(([id, name]) => (
                      <option value={id} key={id}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>
          <footer className="modal-footer">
            <button className="secondary" onClick={() => setModal("")}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={busy("proposal")}
              onClick={() =>
                void act("proposal", async () => {
                  await rpc("acceptProposal", {
                    id: card?.id,
                    proposals: proposal,
                  });
                  setModal("");
                })
              }
            >
              <Check size={15} />
              Accept proposal
            </button>
          </footer>
        </Modal>
      )}
      {error && modal && (
        <div className="toast" role="alert">
          {error}
          <button className="icon-button" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
