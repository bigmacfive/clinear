import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Service } from "../engine/service.js";
const service = new Service(
  mkdtempSync(join(tmpdir(), "clinear-live-")),
  () => {},
);
await service.dispatch("setupSample");
for (const id of ["codex", "grok"]) {
  const result = await service.dispatch("probe", { agent: id });
  console.log(
    JSON.stringify({
      agent: id,
      auth: result.auth,
      detail: result.detail.slice(-1800),
    }),
  );
}
try {
  const proposal = await service.integrations.propose(
    service.snapshot().cards[0],
  );
  console.log(JSON.stringify({ cline: "ok", tasks: proposal.length }));
} catch (e) {
  console.log(
    JSON.stringify({ cline: "failed", error: service.redact(String(e)) }),
  );
}
service.shutdown();
service.store.close();
