import { type ReactNode } from "react";
import { CircleCheck, Loader2, CircleDashed, Circle, X } from "lucide-react";
import type { AgentId, Stage } from "./types";
export const names: Record<AgentId, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok Build",
};
const initials: Record<AgentId, string> = {
  claude: "✳",
  codex: "⌘",
  grok: "𝕏",
};
export function AgentIcon({
  id,
  small = false,
}: {
  id: AgentId;
  small?: boolean;
}) {
  return (
    <span className={`agent-icon ${id} ${small ? "small" : ""}`}>
      {initials[id]}
    </span>
  );
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
