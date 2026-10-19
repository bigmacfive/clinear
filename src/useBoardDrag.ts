import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Card, Stage } from "./types";

export function dropReason(source: Stage, target: Stage): string {
  if (source === "Running") return "Cancel the running task before moving it";
  if (source === target) return "Already in this column";
  if (target === "Running") return "Open the issue and use Run to start an agent";
  if (target === "Done") return "Review and publish the result to complete this issue";
  return "";
}

export function useBoardDrag(move: (id: string, stage: Stage) => void) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<Card | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const reset = () => { setDragged(null); setOver(null); velocity.current = { x: 0, y: 0 }; };
  useEffect(() => {
    if (!dragged) return;
    let frame = 0;
    let previous = performance.now();
    const scroll = (now: number) => {
      const scale = Math.min(now - previous, 40) / 16.67;
      previous = now;
      boardRef.current?.scrollBy(velocity.current.x * scale, velocity.current.y * scale);
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") reset(); };
    window.addEventListener("keydown", escape);
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    window.addEventListener("blur", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
      window.removeEventListener("blur", reset);
    };
  }, [dragged]);
  return {
    boardRef, dragged, over,
    start(e: PointerEvent, card: Card) {
      if (e.button !== 0) return;
      const origin = { x: e.clientX, y: e.clientY };
      let active = false;
      let target: Stage | null = null;
      const element = e.currentTarget as HTMLElement;
      element.setPointerCapture(e.pointerId);
      const update = (event: globalThis.PointerEvent) => {
        if (!active && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 6) return;
        active = true;
        setDragged(card);
        const column = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-stage]");
        target = (column?.dataset.stage as Stage) || null;
        setOver(target);
        const r = boardRef.current?.getBoundingClientRect();
        if (!r) return;
        const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
        const speed = (p: number, min: number, max: number) => p < min + 64
          ? -14 * Math.max(0, 1 - (p - min) / 64)
          : p > max - 64 ? 14 * Math.max(0, 1 - (max - p) / 64) : 0;
        velocity.current = inside ? { x: speed(event.clientX, r.left, r.right), y: speed(event.clientY, r.top, r.bottom) } : { x: 0, y: 0 };
      };
      const finish = (event?: globalThis.PointerEvent) => {
        if (active) {
          // A drag must not also open the card when the pointer is released.
          const suppress = (click: MouseEvent) => { click.preventDefault(); click.stopPropagation(); };
          window.addEventListener("click", suppress, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", suppress, true), 0);
          if (event?.type === "pointerup" && target && !dropReason(card.stage, target)) move(card.id, target);
        }
        reset();
        window.removeEventListener("pointermove", update);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        window.removeEventListener("blur", cancel);
        window.removeEventListener("keydown", key);
      };
      const cancel = () => finish();
      const key = (event: KeyboardEvent) => { if (event.key === "Escape") finish(); };
      window.addEventListener("pointermove", update);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      window.addEventListener("blur", cancel);
      window.addEventListener("keydown", key);
    },
  };
}
