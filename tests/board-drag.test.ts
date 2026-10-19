import test from 'node:test';
import assert from 'node:assert/strict';
import { dropReason } from '../src/useBoardDrag';
import { stages } from '../src/types';

test('board movement cannot bypass execution or publishing approval', () => {
  for (const source of stages) {
    if (source !== 'Running') assert.ok(dropReason(source, 'Running'));
    if (source !== 'Done') assert.ok(dropReason(source, 'Done'));
    assert.equal(dropReason(source, source), '');
  }
  for (const target of stages) if (target !== 'Running') assert.ok(dropReason('Running', target));
});
test('idle issues can move between planning and review columns', () => {
  assert.equal(dropReason('Backlog', 'Ready'), '');
  assert.equal(dropReason('Ready', 'Backlog'), '');
  assert.equal(dropReason('Review', 'Ready'), '');
  assert.equal(dropReason('Done', 'Backlog'), '');
});
