import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldDisplayLinkingCode } from './family-code-visibility';

test('linking numbers are visible only after verifying that no caregiver is linked', () => {
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: false, isError: false }), false);
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: false, isError: false, data: [] }), false);
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: true, isError: false, data: [{}] }), false);
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: true, isError: true, data: [] }), false);
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: true, isError: false }), false);
  assert.equal(shouldDisplayLinkingCode({ isFetchedAfterMount: true, isError: false, data: [] }), true);
});