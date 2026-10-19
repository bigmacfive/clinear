import { anonymousSearch } from "../engine/parallel.js";
import { Service } from "../engine/service.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const s = new Service(
  mkdtempSync(join(tmpdir(), "clinear-research-")),
  () => {},
);
await s.dispatch("setupSample");
try {
  const results = await anonymousSearch(
    "Find official JavaScript Array.sort stable sorting and Node.js test runner documentation",
    "clinear-verification-20261019",
  );
  console.log(JSON.stringify({ parallel: "ok", sources: results }));
} catch (e) {
  console.log(JSON.stringify({ parallel: "failed", error: String(e) }));
}
try {
  const p = await s.integrations.propose(s.snapshot().cards[0]);
  console.log(
    JSON.stringify({ cline: "ok", provider: s.settings.provider, proposal: p }),
  );
} catch (e) {
  console.log(JSON.stringify({ cline: "failed", error: s.redact(String(e)) }));
}
s.store.close();
