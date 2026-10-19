import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTask } from './queue.js';

test('the highest-priority task runs first', () => {
  assert.equal(nextTask([{ id: 'low', priority: 1 }, { id: 'urgent', priority: 5 }]).id, 'urgent');
});

test('an empty queue returns null', () => {
  assert.equal(nextTask([]), null);
});
