import { Modal } from "./ui";
import { Select } from "./Controls";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { Automation } from "./types";
export function AutopilotPanel({
  config,
  close,
  save,
  start,
  pause,
  research,
  busy,
}: {
  config: Automation;
  close: () => void;
  save: (v: unknown) => Promise<unknown>;
  start: () => void;
  pause: () => void;
  research: () => void;
  busy: boolean;
}) {
  const [goal, setGoal] = useState(config.goal);
  const [intervalHours, setInterval] = useState(config.intervalHours);
  const [runBudget, setBudget] = useState(config.runBudget);
  const [maxIdeas, setIdeas] = useState(config.maxIdeas);
  const [researchEnabled, setResearch] = useState(config.researchEnabled);
  const [saved, setSaved] = useState(false);
  const dirty =
    goal !== config.goal ||
    intervalHours !== config.intervalHours ||
    runBudget !== config.runBudget ||
    maxIdeas !== config.maxIdeas ||
    researchEnabled !== config.researchEnabled;
  return (
    <Modal title="Autopilot" close={close} wide>
      <div className="automation-overview">
        <strong>
          {config.enabled ? "Execution active" : "Execution paused"} ·{" "}
          {config.runsUsed}/{config.runBudget} runs used
        </strong>
        <p>
          Research:{" "}
          {config.researchEnabled
            ? `Next scan ${config.nextResearchAt ? new Date(config.nextResearchAt).toLocaleString() : "not scheduled yet"}`
            : "Off"}
        </p>
        <small>{config.lastMessage}</small>
      </div>
      <div className="autopilot-flow">
        <span>
          <Search size={14} />
          Discover
        </span>
        <ArrowRight size={12} />
        <span>
          <Sparkles size={14} />
          Triage
        </span>
        <ArrowRight size={12} />
        <span>
          <Zap size={14} />
          Build
        </span>
        <ArrowRight size={12} />
        <span>
          <ShieldCheck size={14} />
          Review
        </span>
      </div>
      <label className="field-label" htmlFor="service-goal">
        What should this service become?
      </label>
      <textarea
        id="service-goal"
        rows={3}
        value={goal}
        onChange={(e) => {
          setGoal(e.target.value);
          setSaved(false);
        }}
        placeholder="Our service helps small engineering teams delegate work to local AI. Find focused improvements to reliability, collaboration, and review quality."
      />
      <p className="settings-footnote">
        Research uses this goal with Parallel. Cline reads the project README
        and package manifest to judge relevance, then compares ideas with the
        existing backlog.
      </p>
      <div className="automation-section">
        <div className="automation-section-header">
          <div>
            <h3>
              <Search size={15} />
              Discovery loop
            </h3>
            <p>
              Research opportunities and add up to {maxIdeas} sourced ideas per
              scan.
            </p>
          </div>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={researchEnabled}
              onChange={(e) => setResearch(e.target.checked)}
            />
            <span className="switch" />
            <span>{researchEnabled ? "Scheduled" : "Off"}</span>
          </label>
        </div>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="research-interval">
              Research every
            </label>
            <Select
              id="research-interval"
              value={intervalHours}
              onChange={(e) => setInterval(Number(e.target.value))}
            >
              <option value={0.25}>15 minutes · demo</option>
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={168}>Every week</option>
            </Select>
          </div>
          <div>
            <label className="field-label" htmlFor="research-ideas">
              Maximum ideas per scan
            </label>
            <Select
              id="research-ideas"
              value={maxIdeas}
              onChange={(e) => setIdeas(Number(e.target.value))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n} idea{n > 1 ? "s" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="schedule-note">
          <Clock3 size={12} />
          <span>
            Runs while Clinear is open.
            {config.nextResearchAt &&
              ` Next: ${new Date(config.nextResearchAt).toLocaleString()}`}
          </span>
          <button
            className="text-button"
            disabled={dirty || busy || !goal.trim()}
            onClick={research}
          >
            Research now
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
      <div className="automation-section">
        <div className="automation-section-header">
          <div>
            <h3>
              <Zap size={15} />
              Execution loop
            </h3>
            <p>
              Pick up clear tasks, build with Codex, and request Grok review.
            </p>
          </div>
          <span
            className={`autopilot-status ${config.enabled ? "active" : ""}`}
          >
            <span className={`live-dot ${config.enabled ? "working" : ""}`} />
            {config.enabled ? "Active" : "Paused"}
          </span>
        </div>
        <label className="field-label" htmlFor="run-budget">
          Run budget for this batch · includes review runs
        </label>
        <input
          id="run-budget"
          type="number"
          min={1}
          max={20}
          value={runBudget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />
        <div className="execution-constraints">
          <span>
            <Check size={12} />
            One worker at a time
          </span>
          <span>
            <Check size={12} />
            Questions block the task
          </span>
          <span>
            <Check size={12} />
            No automatic publishing
          </span>
        </div>
        <div className="autopilot-progress">
          <div>
            <span
              style={{
                width: `${Math.min(100, (config.runsUsed / config.runBudget) * 100)}%`,
              }}
            />
          </div>
          <small>
            {config.runsUsed} / {config.runBudget} runs used
          </small>
        </div>
      </div>
      <div className="automation-message" role="status">
        {config.lastMessage}
      </div>
      <footer className="modal-footer">
        <span className="saved-note">
          {saved && !dirty ? "Settings saved" : ""}
        </span>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            void save({
              goal,
              intervalHours,
              runBudget,
              maxIdeas,
              researchEnabled,
            }).then((v) => {
              if (v !== undefined) setSaved(true);
            });
          }}
        >
          Save settings
        </button>
        {config.enabled ? (
          <button className="secondary stop-button" onClick={pause}>
            <Pause size={14} />
            Pause & stop
          </button>
        ) : (
          <button className="primary" disabled={dirty || busy} onClick={start}>
            <Play size={14} />
            Start autopilot
          </button>
        )}
      </footer>
    </Modal>
  );
}
