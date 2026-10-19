import { type ReactNode } from "react";
import { CircleCheck, Loader2, CircleDashed, Circle, X, LockKeyhole } from "lucide-react";
import type { AgentId, Stage } from "./types";
export const names: Record<AgentId, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok Build",
};
export const upcomingAgents = [
  { id: "hermes", name: "Hermes", detail: "A learning teammate for your local workflow." },
  { id: "openclaw", name: "OpenClaw", detail: "Your personal agent, connected to the board." },
  { id: "kimi", name: "Kimi", detail: "Another coding teammate. One shared workspace." },
] as const;
type BrandId = AgentId | typeof upcomingAgents[number]["id"] | "cline" | "github";
const logos: Record<BrandId, string> = { claude: "claudecode-color", codex: "codex", grok: "grok", hermes: "hermesagent", openclaw: "openclaw-color", kimi: "kimi-color", cline: "cline", github: "github" };
export function AgentIcon({
  id,
  small = false,
}: {
  id: BrandId;
  small?: boolean;
}) {
  return (
    <span className={`agent-icon ${id} ${small ? "small" : ""}`}>
      <img src={`/brands/${logos[id]}.svg`} className={logos[id].endsWith("-color") ? "brand-color" : "brand-mono"} alt="" aria-hidden="true" />
    </span>
  );
}
export function UpcomingAgent({ agent, variant = "pill" }: { agent: typeof upcomingAgents[number]; variant?: "pill" | "nav" | "connection" }) {
  if (variant === "connection") return <div className="connection-row upcoming-connection"><AgentIcon id={agent.id} /><div className="connection-main"><strong>{agent.name}<span className="coming-badge"><LockKeyhole size={10} />Coming soon</span></strong><small>{agent.detail}</small></div><button className="secondary compact" disabled aria-label={`${agent.name} connection unavailable`}>Unavailable</button></div>;
  return <button disabled className={`${variant === "nav" ? "agent-nav" : "agent-pill"} upcoming-agent`} title={`${agent.name} · Coming soon. Not connected or executable.`}><AgentIcon id={agent.id} small /><span>{agent.name}{variant === "nav" && <small className="optional-agent">coming soon</small>}</span><LockKeyhole size={11} aria-label="Unavailable" /></button>;
}
export function StatusIcon({ stage }: { stage: Stage }) {
  return stage === "Done" ? (
    <CircleCheck size={14} />
  ) : stage === "Running" ? (
    <Loader2 size={14} className="spin" />
  ) : stage === "Backlog" ? (
    <CircleDashed size={14} />
  ) : stage === "Review" ? (
    <span className="review-dot" />
  ) : (
    <Circle size={14} />
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
