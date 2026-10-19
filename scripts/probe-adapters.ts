import { detect, start, normalize } from "../engine/adapters.js";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
for (const id of ["claude", "grok"] as const) {
  const a = detect(id);
  await new Promise<void>((resolve) => {
    let out = "";
    const child = start(
      id,
      a.path,
      "Reply with exactly CLINEAR_OK. Do not use tools or change files.",
      process.cwd(),
      (line) => {
        try {
          const e = JSON.parse(line);
          if (!["system", "usage"].includes(e.type))
            out += JSON.stringify(e).slice(0, 1800) + "\n";
        } catch {
          out += line + "\n";
        }
      },
      (line) => {
        if (!line.includes("WARN")) out += line + "\n";
      },
      true,
    );
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, 45000);
    child.once("close", (code) => {
      clearTimeout(timer);
      console.log(JSON.stringify({ id, code, output: out.slice(-7000) }));
      resolve();
    });
  });
}
