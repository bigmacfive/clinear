import type { Card } from './types';

// Unranked cards are appended in their original creation order.
export function compareBoardCards(a: Card, b: Card) {
  return (a.boardOrder ?? Number.MAX_SAFE_INTEGER) - (b.boardOrder ?? Number.MAX_SAFE_INTEGER)
    || a.number - b.number || a.id.localeCompare(b.id);
}
