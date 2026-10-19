import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Service } from "../engine/service.js";
import { argsFor, normalize } from "../engine/adapters.js";
import { Integrations, parseIssue } from "../engine/integrations.js";
import type { Card, Run } from "../src/types.js";
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "clinear-test-"));
  const service = new Service(dir, () => {});
  return {
    service,
    dir,
    close: () => {
      service.shutdown();
      service.store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const waitFor = async (fn: () => boolean) => {
  for (let n = 0; n < 100; n++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw Error("Timed out");
};
test("parsers preserve final output and report structured provider errors", () => {
  assert.equal(
    normalize(
      "claude",
      JSON.stringify({
        type: "result",
        is_error: true,
        result: "Not authenticated",
      }),
    )[0].failure,
    true,
  );
  assert.equal(
    normalize(
      "codex",
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: "Tests passed" },
      }),
    )[0].text,
    "Tests passed",
  );
  assert.equal(
    normalize(
      "grok",
      JSON.stringify({
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { text: "Reviewed" },
        },
      }),
    )[0].text,
    "Reviewed",
  );
  assert.equal(
    normalize("codex", '{"type":"turn.failed","error":{"message":"quota"}}')[0]
      .failure,
    true,
  );
  assert.equal(normalize("claude", "partial non JSON")[0].type, "log");
  assert.equal(normalize("codex", '{"type":"item.completed","item":{"type":"error","message":"Ignored config option"}}')[0].type, "warning");
  assert.equal(normalize("codex", '{"type":"turn.completed"}')[0].type, "system");
  assert.deepEqual(normalize("grok", '{"type":"thought","data":"internal"}'), []);
  assert.equal(normalize("grok", '{"type":"end","stopReason":"cancelled"}')[0].failure, true);
});
test("commands pass literal prompt arguments without shell interpolation", () => {
  const reviewArgs = argsFor("grok", "Review supplied evidence", "/tmp/repo", false, true);
  assert.equal(reviewArgs[reviewArgs.indexOf("--tools") + 1], "");
  assert.ok(!reviewArgs.includes("--allow"));
  const prompt = "$(touch /tmp/not-allowed); `echo danger`";
  for (const id of ["claude", "codex", "grok"] as const) {
    assert.ok(argsFor(id, prompt, "/tmp/repo").includes(prompt));
    assert.ok(
      !argsFor(id, prompt, "/tmp/repo").includes(
        "--dangerously-bypass-approvals-and-sandbox",
      ),
    );
  }
});
test("GitHub URL validation prevents arbitrary proxy targets", () => {
  assert.equal(parseIssue("https://github.com/a/b/issues/42").number, 42);
  for (const bad of [
    "https://evil.test/a/b/issues/1",
    "http://github.com/a/b/issues/1",
    "https://github.com/a/b/issues/1?q=x",
    "https://github.com/a/b/pull/1",
  ])
    assert.throws(() => parseIssue(bad));
});
test("startup recovers running jobs without restarting processes", () => {
  const { service, close } = fixture();
  try {
    service.store.put("run", { id: "r", cardId: "c", status: "running" });
    service.store.put("card", { id: "c", stage: "Running" });
    service.store.recover();
    assert.equal(service.store.get<Run>("run", "r")?.status, "interrupted");
    assert.equal(service.store.get<Card>("card", "c")?.flag, "interrupted");
    assert.equal(service.active.size, 0);
  } finally {
    close();
  }
});
test("sample repository has a real failing test and sequential dependencies", async () => {
  const { service, close } = fixture();
  try {
    const p = await service.dispatch("setupSample");
    const cards = service.snapshot().cards;
    assert.equal(cards.length, 3);
    assert.equal(cards[0].stage, "Ready");
    await assert.rejects(
      service.dispatch("run", { id: cards[1].id }),
      /Dependency/,
    );
    await assert.rejects(
      service.dispatch("updateCard", {
        id: cards[0].id,
        patch: { stage: "Done" },
      }),
      /Approve/,
    );
    await assert.rejects(
      service.dispatch("updateCard", {
        id: cards[0].id,
        patch: { dependencies: [cards[1].id] },
      }),
      /cycle/,
    );
    assert.equal((await service.dispatch("setupSample")).id, p.id);
  } finally {
    close();
  }
});
test("duplicate execution is rejected and cancellation preserves worktree", async () => {
  const { service, dir, close } = fixture();
  try {
    await service.dispatch("setupSample");
    const c = service.snapshot().cards[0];
    const fake = join(dir, "worker");
    writeFileSync(
      fake,
      '#!/bin/sh\necho \'{"type":"assistant","message":{"content":[{"type":"text","text":"Working"}]}}\'\nsleep 30\n',
      { mode: 0o755 },
    );
    service.updateSettings({ codexPath: fake });
    const run = await service.dispatch("run", { id: c.id });
    await assert.rejects(
      service.dispatch("run", { id: c.id }),
      /cannot be started/,
    );
    assert.ok(service.card(c.id).worktree);
    await service.dispatch("cancel", { id: c.id });
    await waitFor(() => !service.active.size);
    assert.equal(service.store.get<Run>("run", run.id)?.status, "cancelled");
    assert.equal(service.card(c.id).flag, "interrupted");
    assert.ok(service.card(c.id).worktree);
  } finally {
    close();
  }
});
test("provider failure never moves card to review", async () => {
  const { service, dir, close } = fixture();
  try {
    await service.dispatch("setupSample");
    const c = service.snapshot().cards[0];
    const fake = join(dir, "worker");
    writeFileSync(
      fake,
      '#!/bin/sh\necho \'{"type":"result","is_error":true,"result":"Authentication failed"}\'\nexit 0\n',
      { mode: 0o755 },
    );
    service.updateSettings({ codexPath: fake });
    await service.dispatch("run", { id: c.id });
    await waitFor(() => !service.active.size);
    assert.equal(service.card(c.id).flag, "failed");
    assert.equal(service.card(c.id).stage, "Ready");
  } finally {
    close();
  }
});
test("successful worker enters review; TESTS_FAILED keeps it blocked", async () => {
  const { service, dir, close } = fixture();
  try {
    await service.dispatch("setupSample");
    const c = service.snapshot().cards[0];
    const fake = join(dir, "worker");
    writeFileSync(
      fake,
      '#!/bin/sh\necho \'{"type":"result","result":"Tests passed: 2/2"}\'\n',
      { mode: 0o755 },
    );
    service.updateSettings({ codexPath: fake });
    await service.dispatch("run", { id: c.id });
    await waitFor(() => !service.active.size);
    assert.equal(service.card(c.id).stage, "Review");
    writeFileSync(
      fake,
      '#!/bin/sh\necho \'{"type":"result","result":"TESTS_FAILED: assertion failed"}\'\n',
      { mode: 0o755 },
    );
    await service.dispatch("run", { id: c.id });
    await waitFor(() => !service.active.size);
    assert.equal(service.card(c.id).flag, "blocked");
  } finally {
    close();
  }
});
test("same-issue worktree lock prevents concurrent writes", async () => {
  const { service, dir, close } = fixture();
  try {
    await service.dispatch("setupSample");
    const c = service.snapshot().cards[0];
    await service.dispatch("updateCard", {
      id: c.id,
      patch: { issueUrl: "https://github.com/a/b/issues/1" },
    });
    const other = await service.dispatch("createCard", {
      projectId: c.projectId,
      title: "Second writer",
      issueUrl: "https://github.com/a/b/issues/1",
    });
    const fake = join(dir, "worker");
    writeFileSync(fake, "#!/bin/sh\nsleep 30\n", { mode: 0o755 });
    service.updateSettings({ codexPath: fake });
    await service.dispatch("run", { id: c.id });
    await assert.rejects(
      service.dispatch("run", { id: other.id }),
      /Another worker/,
    );
    await service.dispatch("cancel", { id: c.id });
    await waitFor(() => !service.active.size);
  } finally {
    close();
  }
});
test("publication reconciles lost POST response before retry and verifies result", async () => {
  const { service, close } = fixture();
  try {
    await service.dispatch("setupSample");
    const c = {
      ...service.snapshot().cards[0],
      issueUrl: "https://github.com/a/b/issues/1",
    };
    let posted: any = null,
      posts = 0;
    const integration = new Integrations(service.store, () => service.settings);
    integration.github = async (_path, method, body: any) => {
      if (method === "POST") {
        posts++;
        posted = {
          id: 123,
          body: body.body,
          html_url: "https://github.com/a/b/issues/1#issuecomment-123",
        };
        throw Error("Connection lost after write");
      }
      return posted ? [posted] : [];
    };
    await assert.rejects(integration.publish(c, "Reviewed outcome"), /lost/);
    const url = await integration.publish(c, "Reviewed outcome");
    assert.equal(posts, 1);
    assert.ok(url.endsWith("123"));
    await assert.rejects(
      integration.publish(c, "Changed outcome"),
      /different content/,
    );
  } finally {
    close();
  }
});
test("secrets are redacted from activity and omitted from snapshots", () => {
  const { service, close } = fixture();
  try {
    process.env.CLINEAR_TEST_SECRET = "a-very-private-value";
    service.log("c", "r", "log", "credential a-very-private-value");
    assert.equal(service.store.events("c")[0].text, "credential [redacted]");
    assert.ok(
      !JSON.stringify(service.snapshot()).includes("a-very-private-value"),
    );
  } finally {
    delete process.env.CLINEAR_TEST_SECRET;
    close();
  }
});
