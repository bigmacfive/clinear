import type { AgentModel } from "@cline/agents";
import { detect, start, cancel, normalize } from "./adapters.js";
/** Cline owns the agent loop; the signed-in Codex CLI supplies a read-only model turn. */
export function localCodexModel(path: string, cwd: string): AgentModel {
  return {
    async *stream(request) {
      const executable = detect("codex", path);
      if (!executable.installed)
        throw Error("Install or configure Codex to use local Cline planning.");
      const prompt =
        [
          request.systemPrompt,
          ...request.messages.flatMap((m) =>
            m.content
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text),
          ),
        ]
          .filter(Boolean)
          .join("\n\n") +
        "\nReturn ONLY the requested JSON. Do not use tools, read files, or perform any work.";
      const output = await new Promise<string>((resolve, reject) => {
        let final = "";
        let failure = "";
        const child = start(
          "codex",
          executable.path,
          prompt,
          cwd,
          (line) => {
            for (const e of normalize("codex", line)) {
              if (e.type === "message" && !line.includes('"type":"error"'))
                final = e.text;
              if (e.failure) failure = e.text;
            }
          },
          () => {},
          true,
        );
        const abort = () => cancel(child);
        request.signal?.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(abort, 120000);
        child.once("error", reject);
        child.once("close", (code) => {
          clearTimeout(timer);
          request.signal?.removeEventListener("abort", abort);
          if (code !== 0 || failure || !final)
            reject(
              Error(
                failure || "Local Codex planning did not return a response.",
              ),
            );
          else resolve(final);
        });
      });
      yield { type: "text-delta", text: output };
      yield { type: "finish", reason: "stop" };
    },
  };
}
