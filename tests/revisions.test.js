const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRevisions, REVISION_INTERVALS } = require('../server');

test('generateRevisions creates seven spaced revision checkpoints', () => {
  const completionDate = new Date('2026-01-01T00:00:00.000Z');
  const revisions = generateRevisions(completionDate);

  assert.equal(revisions.length, 7);
  revisions.forEach((revision, index) => {
    assert.equal(revision.revisionNumber, index + 1);
    assert.equal(revision.isDone, false);

    const expectedDate = new Date(completionDate);
    expectedDate.setDate(expectedDate.getDate() + REVISION_INTERVALS[index]);
    assert.equal(new Date(revision.targetDate).toISOString(), expectedDate.toISOString());
  });
});
