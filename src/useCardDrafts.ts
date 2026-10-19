import { useRef, useState } from "react";
import { rpc } from "./api";
import type { Card } from "./types";
type Patch = Pick<Partial<Card>, "feedback" | "commentDraft">;
export function useCardDrafts() {
  const [drafts, setDrafts] = useState<Record<string, Patch>>(() => {
    try {
      return JSON.parse(localStorage.getItem("clinear-card-drafts") || "{}");
    } catch {
      return {};
    }
  });
  const ref = useRef(drafts);
  const tasks = useRef(new Map<string, Promise<void>>());
  const [status, setStatus] = useState<Record<string, string>>({});
  function persist(next: Record<string, Patch>) {
    ref.current = next;
    setDrafts(next);
    try {
      localStorage.setItem("clinear-card-drafts", JSON.stringify(next));
    } catch {}
  }
  function edit(id: string, patch: Patch) {
    persist({ ...ref.current, [id]: { ...ref.current[id], ...patch } });
    setStatus((s) => ({ ...s, [id]: "Unsaved changes" }));
  }
  async function flush(id: string): Promise<void> {
    const previous = tasks.current.get(id);
    if (previous) await previous;
    const patch = ref.current[id];
    if (!patch || !Object.keys(patch).length) return;
    const task = (async () => {
      setStatus((s) => ({ ...s, [id]: "Saving…" }));
      try {
        await rpc("updateCard", { id, patch });
        const remaining = { ...ref.current[id] };
        for (const key of ["feedback", "commentDraft"] as const)
          if (remaining[key] === patch[key]) delete remaining[key];
        persist({ ...ref.current, [id]: remaining });
        setStatus((s) => ({
          ...s,
          [id]: Object.keys(remaining).length ? "Unsaved changes" : "Saved",
        }));
      } catch (e) {
        setStatus((s) => ({ ...s, [id]: "Save failed · retry" }));
        throw e;
      }
    })();
    tasks.current.set(id, task);
    try {
      await task;
    } finally {
      if (tasks.current.get(id) === task) tasks.current.delete(id);
    }
    if (Object.keys(ref.current[id] || {}).length) await flush(id);
  }
  return { drafts, edit, flush, status };
}
