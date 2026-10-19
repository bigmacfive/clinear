import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Source } from "../src/types.js";
/** Anonymous access is officially supported for light research; no API calls are simulated. */
export async function anonymousSearch(
  objective: string,
  sessionId: string,
): Promise<Source[]> {
  const client = new Client({ name: "clinear", version: "0.1.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL("https://search.parallel.ai/mcp"),
      ),
    );
    const result = await client.callTool(
      {
        name: "web_search",
        arguments: {
          objective: `Find current primary documentation directly relevant to the technical problem or product opportunity below. Use the full context, including language and runtime; avoid unrelated products with similar task titles.\n${objective}`.slice(0, 12000),
          session_id: sessionId,
        },
      },
      undefined,
      { timeout: 45000 },
    );
    if (result.isError)
      throw Error(
        "Parallel MCP could not complete the search. Add a Parallel API key or retry later.",
      );
    const content = result.content as { type: string; text?: string }[];
    const texts = content
      .filter((c) => c.type === "text")
      .map((c) => c.text || "");
    const structured = result.structuredContent as any;
    const candidates: any[] = [];
    if (structured?.results) candidates.push(...structured.results);
    for (const text of texts) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.results)) candidates.push(...parsed.results);
      } catch {}
    }
    if (candidates.length)
      return [...new Map(candidates.map((c) => [c.url, c])).values()]
        .filter((c) => typeof c.url === "string" && /^https?:\/\//.test(c.url))
        .slice(0, 8)
        .map((c) => ({
          title: c.title || new URL(c.url).hostname,
          url: c.url,
          excerpts: Array.isArray(c.excerpts) ? c.excerpts : [c.snippet || ""],
        }));
    // The public MCP also returns human-readable text blocks. Preserve them with their source URLs.
    const combined = texts.join("\n");
    const urls = [
      ...new Set(combined.match(/https?:\/\/[^\s<>\)\]"']+/g) || []),
    ].slice(0, 8);
    if (!urls.length)
      throw Error(
        "Parallel returned no usable source URLs. No research was fabricated.",
      );
    return urls.map((url) => {
      const index = combined.indexOf(url);
      const start = combined.lastIndexOf("\n", index);
      const title =
        combined
          .slice(Math.max(0, start - 180), index)
          .trim()
          .split("\n")
          .filter(Boolean)
          .at(-1)
          ?.replace(/^#+\s*/, "") || new URL(url).hostname;
      return {
        title: title.slice(0, 180),
        url,
        excerpts: [combined.slice(Math.max(0, index - 100), index + 2200)],
      };
    });
  } finally {
    await client.close().catch(() => {});
  }
}
