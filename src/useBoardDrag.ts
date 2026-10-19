import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Card, Stage } from "./types";

export function dropReason(source: Stage, target: Stage): string {
  if (source === target) return "";
  if (source === "Running") return "Cancel the running task before moving it";
  if (target === "Running") return "Open the issue and use Run to start an agent";
  if (target === "Done") return "Review and publish the result to complete this issue";
  return "";
}

export function useBoardDrag(move: (id: string, stage: Stage, beforeId: string | null) => void) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<Card | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  return {
    boardRef, dragged, over,
    start(e: PointerEvent, card: Card) {
      if (e.button !== 0) return;
      cleanup.current?.();
      const pointerId = e.pointerId;
      const origin = { x: e.clientX, y: e.clientY };
      const position = { ...origin };
      let active = false;
      let target: Stage | null = null;
      let beforeId: string | null = null;
      let marker: HTMLElement | null = null;
      let frame = 0;
      let previous = performance.now();
      let ghost: HTMLElement | null = null;
      let hint: HTMLElement | null = null;
      let speedX = 0;
      let speedY = 0;
      const element = e.currentTarget as HTMLElement;
      const bounds = element.getBoundingClientRect();
      const offset = { x: origin.x - bounds.left, y: origin.y - bounds.top };
      element.setPointerCapture(pointerId);
      const locate = () => {
        const column = document.elementFromPoint(position.x, position.y)?.closest<HTMLElement>("[data-stage]");
        const next = (column?.dataset.stage as Stage) || null;
        if (next !== target) {
          target = next;
          setOver(next);
        }
        const allowed = next && !dropReason(card.stage, next);
        beforeId = null;
        if (allowed && column && marker) {
          const siblings = Array.from(column.querySelectorAll<HTMLElement>("[data-card-id]"))
            .filter(item => item.dataset.cardId !== card.id);
          const before = siblings.find(item => {
            const rect = item.getBoundingClientRect();
            return position.y < rect.top + rect.height / 2;
          });
          beforeId = before?.dataset.cardId || null;
          const list = column.querySelector<HTMLElement>(".column-cards")!;
          const rect = list.getBoundingClientRect();
          const last = siblings.at(-1)?.getBoundingClientRect();
          const y = before ? before.getBoundingClientRect().top - 5 : last ? last.bottom + 5 : rect.top;
          const board = boardRef.current!.getBoundingClientRect();
          const left = Math.max(rect.left, board.left);
          const right = Math.min(rect.right, board.right);
          marker.hidden = y < board.top || y > board.bottom || right <= left;
          marker.style.width = `${Math.max(0, right - left)}px`;
          marker.style.transform = `translate3d(${left}px, ${y}px, 0)`;
        } else if (marker) marker.hidden = true;
        if (hint) hint.textContent = next ? dropReason(card.stage, next) || (next === card.stage ? "Reorder in " : "Move to ") + next : "Release to cancel";
        ghost?.classList.toggle("invalid-drop", !allowed);

      };
      const tick = (now: number) => {
        const elapsed = Math.min(now - previous, 40);
        previous = now;
        // Update only the compositor transform; don't re-render the board per mouse event.
        if (ghost) ghost.style.transform = `translate3d(${position.x - offset.x}px, ${position.y - offset.y}px, 0) rotate(1deg)`;
        const r = boardRef.current?.getBoundingClientRect();
        let desiredX = 0, desiredY = 0;
        if (r && position.x >= r.left && position.x <= r.right && position.y >= r.top && position.y <= r.bottom) {
          const edge = (p: number, min: number, max: number) => {
            const distance = p < min + 72 ? -(1 - (p - min) / 72) : p > max - 72 ? 1 - (max - p) / 72 : 0;
            return Math.sign(distance) * distance * distance * 12;
          };
          desiredX = edge(position.x, r.left, r.right);
          desiredY = edge(position.y, r.top, r.bottom);
        }
        const easing = 1 - Math.exp(-elapsed / 65);
        speedX += (desiredX - speedX) * easing;
        speedY += (desiredY - speedY) * easing;
        boardRef.current?.scrollBy(speedX * elapsed / 16.67, speedY * elapsed / 16.67);
        // Re-evaluate even with a stationary pointer as columns scroll underneath it.
        locate();
        frame = requestAnimationFrame(tick);
      };
      const update = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        position.x = event.clientX;
        position.y = event.clientY;
        if (!active && Math.hypot(position.x - origin.x, position.y - origin.y) < 5) return;
        if (!active) {
          active = true;
          ghost = element.cloneNode(true) as HTMLElement;
          ghost.removeAttribute("id");
          ghost.removeAttribute("data-draggable");
          ghost.setAttribute("aria-hidden", "true");
          ghost.setAttribute("inert", "");
          ghost.className = "issue-card drag-preview";
          ghost.style.width = `${bounds.width}px`;
          ghost.style.transform = `translate3d(${position.x - offset.x}px, ${position.y - offset.y}px, 0) rotate(1deg)`;
          hint = document.createElement("span");
          hint.className = "drag-preview-hint";
          ghost.append(hint);
          marker = document.createElement("div");
          marker.className = "board-insertion-marker";
          marker.setAttribute("aria-hidden", "true");
          marker.hidden = true;
          document.body.append(ghost, marker);
          document.body.classList.add("board-drag-active");
          setDragged(card);
          previous = performance.now();
          frame = requestAnimationFrame(tick);
        }
      };
      const finish = (event?: globalThis.PointerEvent) => {
        if (event && event.pointerId !== pointerId) return;
        if (active) {
          if (event) { position.x = event.clientX; position.y = event.clientY; locate(); }
          const suppress = (click: MouseEvent) => { click.preventDefault(); click.stopPropagation(); };
          window.addEventListener("click", suppress, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", suppress, true), 0);
          if (event?.type === "pointerup" && target && !dropReason(card.stage, target)) move(card.id, target, beforeId);
        }
        cancelAnimationFrame(frame);
        ghost?.remove();
        marker?.remove();
        document.body.classList.remove("board-drag-active");
        if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
        setDragged(null);
        setOver(null);
        window.removeEventListener("pointermove", update);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        window.removeEventListener("blur", cancel);
        window.removeEventListener("keydown", key);
        cleanup.current = null;
      };
      const cancel = () => finish();
      const key = (event: KeyboardEvent) => { if (event.key === "Escape") finish(); };
      cleanup.current = cancel;
      window.addEventListener("pointermove", update);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      window.addEventListener("blur", cancel);
      window.addEventListener("keydown", key);
    },
  };
}
