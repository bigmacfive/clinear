import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Service } from "./service.js";
import type { Automation, Card, Run } from "../src/types.js";
import { defaultAutomation, eligible, isDuplicate } from "./automation.js";
export class Autopilot {
  private ticking = false;
  private researching = new Set<string>();
  constructor(private s: Service) {
    for (const config of s.store.all<Automation>("automation"))
      if (config.enabled)
        s.store.put("automation", {
          ...config,
          enabled: false,
          lastMessage:
            "Paused after app restart. Review interrupted work, then resume.",
        });
  }
  config(projectId: string) {
    this.s.project(projectId);
    return (
      this.s.store.get<Automation>("automation", projectId) ||
      defaultAutomation(projectId)
    );
  }
  save(config: Automation) {
    this.s.store.put("automation", config);
    this.s.changed();
    return config;
  }
  configure(projectId: string, input: unknown) {
    const config = this.config(projectId);
    const patch = z
      .object({
        goal: z.string().max(4000),
        researchEnabled: z.boolean(),
        intervalHours: z.number().min(0.25).max(168),
        runBudget: z.number().int().min(1).max(20),
        maxIdeas: z.number().int().min(1).max(3),
      })
      .parse(input);
    if (patch.researchEnabled && !patch.goal.trim())
      throw Error("Set a service goal before enabling recurring research.");
    return this.save({
      ...config,
      ...patch,
      nextResearchAt: patch.researchEnabled
        ? new Date(Date.now() + patch.intervalHours * 3600000).toISOString()
        : "",
    });
  }
  start(projectId: string) {
    const c = this.config(projectId);
    return this.save({
      ...c,
      enabled: true,
      runsUsed: 0,
      lastMessage:
        "Autopilot started. Cline will triage the queue before dispatching work.",
    });
  }
  pause(projectId: string) {
    const c = this.config(projectId);
    for (const a of this.s.active.values())
      if (this.s.card(a.run.cardId).projectId === projectId)
        void this.s.dispatch("cancel", { id: a.run.cardId });
    return this.save({
      ...c,
      enabled: false,
      lastMessage:
        "Paused. No new work will start; active workers are being stopped.",
    });
  }
  context(projectId: string) {
    const project = this.s.project(projectId);
    const parts = [`Project: ${project.name}`];
    for (const file of ["README.md", "package.json"]) {
      const path = join(project.path, file);
      if (existsSync(path))
        parts.push(`${file}:\n${readFileSync(path, "utf8").slice(0, 6000)}`);
    }
    return parts.join("\n");
  }
  async research(projectId: string) {
    const config = this.config(projectId);
    if (!config.goal.trim())
      throw Error("Describe the service goal in Autopilot settings first.");
    if (this.researching.has(projectId))
      throw Error("Research is already running for this project.");
    this.researching.add(projectId);
    this.save({
      ...config,
      lastMessage:
        "Parallel is researching opportunities; Cline will compare them with the existing backlog.",
    });
    try {
      const existing = this.s.store
        .all<Card>("card")
        .filter((c) => c.projectId === projectId);
      const result = await this.s.integrations.discover(
        config.goal,
        this.context(projectId),
        existing,
      );
      let added = 0;
      for (const idea of result.ideas.slice(0, config.maxIdeas)) {
        const current = this.s.store
          .all<Card>("card")
          .filter((c) => c.projectId === projectId);
        if (isDuplicate(idea.title, current)) continue;
        const card = await this.s.dispatch("createCard", {
          projectId,
          title: idea.title,
          description: `${idea.description}\n\nWhy this matters\n${idea.value}`,
          acceptance: idea.acceptance,
          agent: "codex",
        });
        this.s.save({
          ...card,
          origin: "research",
          sources: result.sources.filter((s) =>
            idea.sourceUrls.includes(s.url),
          ),
        });
        this.s.log(
          card.id,
          "",
          "research",
          "Created by recurring research: Parallel sources, Cline relevance check, duplicate filter.",
        );
        added++;
      }
      const latest = this.config(projectId);
      return this.save({
        ...latest,
        lastResearchAt: new Date().toISOString(),
        nextResearchAt: latest.researchEnabled
          ? new Date(Date.now() + latest.intervalHours * 3600000).toISOString()
          : "",
        lastMessage: `Research complete: ${added} evidence-backed idea${added === 1 ? "" : "s"} added. ${result.ideas.length - added} duplicate or excess suggestions skipped.`,
      });
    } catch (e) {
      const latest = this.config(projectId);
      this.save({
        ...latest,
        nextResearchAt: latest.researchEnabled
          ? new Date(Date.now() + latest.intervalHours * 3600000).toISOString()
          : "",
        lastMessage: `Research failed: ${this.s.redact(String(e))}`,
      });
      throw e;
    } finally {
      this.researching.delete(projectId);
    }
  }
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      for (const project of this.s.store.projects()) {
        let config = this.config(project.id);
        if (
          config.researchEnabled &&
          config.nextResearchAt &&
          Date.parse(config.nextResearchAt) <= Date.now() &&
          !this.researching.has(project.id)
        ) {
          void this.research(project.id).catch(() => {});
        }
        if (!config.enabled || this.s.active.size > 0) continue;
        if (config.runsUsed >= config.runBudget) {
          this.save({
            ...config,
            enabled: false,
            lastMessage: `Run budget reached (${config.runsUsed}/${config.runBudget}). Review the results before starting another batch.`,
          });
          continue;
        }
        const cards = this.s.store
          .all<Card>("card")
          .filter((c) => c.projectId === project.id);
        const card = cards
          .filter(
            (c) =>
              eligible(c, cards) &&
              !this.s.busy.has(c.id) &&
              !this.s.publishing.has(c.id),
          )
          .sort(
            (a, b) =>
              Number(!!b.reviewOf) - Number(!!a.reviewOf) ||
              a.number - b.number,
          )[0];
        if (!card) {
          if (config.lastMessage !== "Waiting for eligible backlog work.")
            this.save({
              ...config,
              lastMessage: "Waiting for eligible backlog work.",
            });
          continue;
        }
        this.s.busy.add(card.id);
        this.s.log(
          card.id,
          "",
          "planning",
          "Autopilot: Cline is checking readiness and acceptance criteria.",
        );
        try {
          const decision = await this.s.integrations.triage(card, config.goal);
          config = this.config(project.id);
          if (
            !config.enabled ||
            this.s.active.size > 0 ||
            config.runsUsed >= config.runBudget
          )
            continue;
          if (!decision.ready) {
            this.s.save({ ...this.s.card(card.id), flag: "blocked" });
            this.s.log(card.id, "", "question", decision.reason);
            this.save({
              ...config,
              lastMessage: `CL-${card.number} needs your input: ${decision.reason}`,
            });
            continue;
          }
          this.s.save({
            ...this.s.card(card.id),
            stage: "Ready",
            agent: decision.agent,
            acceptance: decision.acceptance || card.acceptance,
          });
          this.s.log(card.id, "", "planning", decision.reason);
          this.s.busy.delete(card.id);
          this.s.run(card.id);
          this.save({
            ...config,
            runsUsed: config.runsUsed + 1,
            lastMessage: `${decision.agent === "grok" ? "Grok" : "Codex"} picked up CL-${card.number}. Run ${config.runsUsed + 1} of ${config.runBudget}.`,
          });
        } catch (e) {
          config = this.config(project.id);
          this.save({
            ...config,
            enabled: false,
            lastMessage: `Autopilot paused: ${this.s.redact(String(e))}`,
          });
          this.s.log(card.id, "", "error", `Autopilot paused: ${String(e)}`);
        } finally {
          this.s.busy.delete(card.id);
        }
      }
    } finally {
      this.ticking = false;
    }
  }
  afterRun(card: Card, run: Run) {
    const cfg = this.config(card.projectId);
    if (!cfg.enabled) return;
    if (run.status !== "succeeded") {
      this.save({
        ...cfg,
        enabled: false,
        lastMessage: `Paused after CL-${card.number} ${run.status}. Inspect the result before continuing.`,
      });
      return;
    }
    if (
      card.agent === "codex" &&
      !card.reviewOf &&
      !this.s.store
        .all<Card>("card")
        .some((c) => c.reviewOf === card.id || c.dependencies.includes(card.id))
    )
      void (async () => {
        const review = await this.s.dispatch("createCard", {
          projectId: card.projectId,
          title: `Review: ${card.title}`,
          description: `Review the implementation for CL-${card.number}. Inspect the actual diff and run relevant tests. Do not modify code. Report actionable findings, or clearly state that no findings were found.\n\nImplementation report:\n${run.summary.slice(-12000)}`,
          acceptance:
            "Review the diff, verify tests, and identify unresolved issues. Use BLOCKED: if changes are required.",
          agent: "grok",
          dependencies: [card.id],
          issueUrl: card.issueUrl,
        });
        this.s.save({
          ...review,
          reviewOf: card.id,
          stage: "Ready",
          worktree: card.worktree,
          branch: card.branch,
          sources: card.sources,
        });
      })().catch((e) => this.s.log(card.id, "", "error", String(e)));
  }
}
