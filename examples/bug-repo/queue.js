// Higher numbers represent more urgent tasks.
export function nextTask(tasks) {
  return [...tasks].sort((a, b) => a.priority - b.priority)[0] ?? null;
}
