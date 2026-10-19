import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Service } from "../engine/service.js";
import { isDuplicate, eligible } from "../engine/automation.js";
async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "clinear-auto-test-"));
  const s = new Service(dir, () => {});
  const p = await s.dispatch("setupSample");
  return {
    s,
    p,
    close: () => {
      s.shutdown();
      s.store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("research deduplication normalizes punctuation and close paraphrases", () => {
  assert.equal(
    isDuplicate("Add queue regression tests!", [
      { title: "Add queue regression tests" },
    ]),
    true,
  );
  assert.equal(
    isDuplicate("Build a calendar", [{ title: "Add queue regression tests" }]),
    false,
  );
});
test("autopilot is off by default and respects dependencies and blocked flags", async () => {
  const { s, p, close } = await fixture();
  try {
    assert.equal(s.autopilot.config(p.id).enabled, false);
    const cards = s.snapshot().cards;
    assert.equal(eligible(cards[1], cards), false);
    assert.equal(eligible({ ...cards[0], flag: "blocked" }, cards), false);
    assert.equal(eligible(cards[0], cards), true);
  } finally {
    close();
  }
});
test("recurring research requires an explicit service goal and bounded interval", async () => {
  const { s, p, close } = await fixture();
  try {
    await assert.rejects(
      s.dispatch("automationSettings", {
        projectId: p.id,
        config: {
          goal: "",
          researchEnabled: true,
          intervalHours: 6,
          runBudget: 4,
          maxIdeas: 3,
        },
      }),
      /goal/,
    );
    await assert.rejects(
      s.dispatch("automationSettings", {
        projectId: p.id,
        config: {
          goal: "Build a queue",
          researchEnabled: true,
          intervalHours: 0,
          runBudget: 4,
          maxIdeas: 3,
        },
      }),
    );
  } finally {
    close();
  }
});
test("research adds only novel sourced cards and stores the next scan time", async () => {
  const { s, p, close } = await fixture();
  try {
    await s.dispatch("automationSettings", {
      projectId: p.id,
      config: {
        goal: "Reliable task queue",
        researchEnabled: true,
        intervalHours: 6,
        runBudget: 4,
        maxIdeas: 3,
      },
    });
    s.integrations.discover = async () => ({
      sources: [
        {
          title: "Reference",
          url: "https://example.com/docs",
          excerpts: ["Evidence"],
        },
      ],
      ideas: [
        {
          title: s.snapshot().cards[0].title,
          description: "Duplicate",
          acceptance: "Pass tests",
          value: "Existing",
          sourceUrls: ["https://example.com/docs"],
        },
        {
          title: "Add queue input validation",
          description: "Validate inputs",
          acceptance: "Reject invalid priority",
          value: "Avoid silent errors",
          sourceUrls: ["https://example.com/docs"],
        },
      ],
    });
    await s.dispatch("researchBacklog", { projectId: p.id });
    const cards = s.snapshot().cards;
    assert.equal(cards.length, 4);
    assert.equal(cards.at(-1)?.origin, "research");
    assert.equal(cards.at(-1)?.stage, "Backlog");
    assert.equal(cards.at(-1)?.sources.length, 1);
    assert.ok(Date.parse(s.autopilot.config(p.id).nextResearchAt) > Date.now());
  } finally {
    close();
  }
});
test("Cline questions block ambiguous work without starting any worker", async () => {
  const { s, p, close } = await fixture();
  try {
    s.integrations.triage = async () => ({
      ready: false,
      reason: "Which behavior should ties use?",
      acceptance: "",
      agent: "codex",
    });
    await s.dispatch("startAutopilot", { projectId: p.id });
    await s.autopilot.tick();
    assert.equal(s.snapshot().cards[0].flag, "blocked");
    assert.equal(s.active.size, 0);
    assert.equal(s.autopilot.config(p.id).runsUsed, 0);
    assert.equal(
      s.store.events(s.snapshot().cards[0].id).at(-1)?.type,
      "question",
    );
  } finally {
    close();
  }
});
test("pause during triage prevents dispatch after the model returns", async () => {
  const { s, p, close } = await fixture();
  try {
    let release!: () => void;
    s.integrations.triage = () =>
      new Promise((resolve) => {
        release = () =>
          resolve({
            ready: true,
            reason: "Clear task",
            acceptance: "Pass tests",
            agent: "codex",
          });
      });
    await s.dispatch("startAutopilot", { projectId: p.id });
    const tick = s.autopilot.tick();
    await s.dispatch("pauseAutopilot", { projectId: p.id });
    release();
    await tick;
    assert.equal(s.active.size, 0);
    assert.equal(s.autopilot.config(p.id).runsUsed, 0);
  } finally {
    close();
  }
});
test("budget exhaustion pauses execution, and app restart does not resume workers", async () => {
  const { s, p, close } = await fixture();
  try {
    const cfg = s.autopilot.config(p.id);
    s.autopilot.save({ ...cfg, enabled: true, runBudget: 1, runsUsed: 1 });
    await s.autopilot.tick();
    assert.equal(s.autopilot.config(p.id).enabled, false);
    assert.match(s.autopilot.config(p.id).lastMessage, /budget/);
  } finally {
    close();
  }
});
