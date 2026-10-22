import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeWorkEvidence,isWorkEvidenceLink,workEvidenceLinks} from '../src/lib/workEvidence';

test('optional evidence stays empty and real links retain order',()=>{
 assert.equal(normalizeWorkEvidence(' \r\n '),'');
 assert.equal(normalizeWorkEvidence(' https://example.com/one \r\n\r\nhttp://example.com/two '),'https://example.com/one\nhttp://example.com/two');
 assert.deepEqual(workEvidenceLinks('https://example.com/one\nhttp://example.com/two'),['https://example.com/one','http://example.com/two']);
});
test('evidence rejects filenames, duplicate links and unsafe protocols before submitting',()=>{
 for(const value of ['Bien_ban_xac_nhan.png','javascript:alert(1)','https://example.com/has space','https://example.com/a\n https://example.com/a '])assert.throws(()=>normalizeWorkEvidence(value));
 assert.equal(isWorkEvidenceLink('javascript:alert(1)'),false);
 assert.equal(isWorkEvidenceLink('https://example.com/a?x=1&y=2#note'),true);
});
