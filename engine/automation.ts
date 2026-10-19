import type { Automation, Card } from "../src/types.js";
export const defaultAutomation = (projectId: string): Automation => ({
  id: projectId,
  projectId,
  goal: "",
  enabled: false,
  researchEnabled: false,
  intervalHours: 6,
  runBudget: 4,
  runsUsed: 0,
  nextResearchAt: "",
  lastResearchAt: "",
  lastMessage: "Autopilot is paused. You decide when the queue starts.",
  maxIdeas: 3,
});
export function isDuplicate(
  title: string,
  cards: Pick<Card, "title">[],
): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const words = (s: string) =>
    new Set(
      normalize(s)
        .split(" ")
        .filter((w) => w.length > 2),
    );
  const a = normalize(title),
    aw = words(title);
  return cards.some((c) => {
    const b = normalize(c.title);
    if (a === b) return true;
    const bw = words(b);
    const intersection = [...aw].filter((w) => bw.has(w)).length;
    return intersection / Math.max(1, new Set([...aw, ...bw]).size) >= 0.72;
  });
}
export function eligible(card: Card, cards: Card[]): boolean {
  return (
    ["Backlog", "Ready"].includes(card.stage) &&
    !card.flag &&
    card.dependencies.every((id) => {
      const dep = cards.find((c) => c.id === id);
      return !!dep && ["Review", "Done"].includes(dep.stage) && !dep.flag;
    })
  );
}
