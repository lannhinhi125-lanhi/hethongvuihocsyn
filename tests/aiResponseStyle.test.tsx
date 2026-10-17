import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ChatMessageText} from '../src/components/ChatMessageText';
import {additionalAIInstructions,responseLength,responseStylePrompt} from '../src/lib/aiResponseStyle';
import {knowledgeAnswerPrompt} from '../src/lib/knowledgeAnswer';
import {toSupabaseRow} from '../src/lib/supabaseMapper';

const instructions='Xưng hô thầy/cô.\nThêm lời nhắc thân thiện. ';
for(const length of ['short','balanced','detailed'] as const){
  const prompt=responseStylePrompt(length,instructions);
  assert.equal(responseLength(prompt),length);
  assert.equal(additionalAIInstructions(prompt),instructions,'preserve existing instructions and typing whitespace');
  assert.match(knowledgeAnswerPrompt('Nghỉ học?',[],'','',prompt),new RegExp(length==='short'?'2–4 câu':length==='detailed'?'Chi tiết':'Vừa phải'));
  assert.deepEqual(toSupabaseRow('rag_bot_config',{systemPrompt:prompt}),{chidanhethong:prompt},'style is plain text in the existing column');
}
assert.equal(responseLength('Hướng dẫn cũ'),'balanced');
assert.equal(additionalAIInstructions('Hướng dẫn cũ'),'Hướng dẫn cũ');
const html=renderToStaticMarkup(<ChatMessageText text={'***Quan trọng***\n**Xin nghỉ trước 2 ngày**\n*Lời nhắc*\n- Báo điều phối\n***\n<script>alert(1)</script>'} />);
assert.match(html,/<strong><em>Quan trọng<\/em><\/strong>/);
assert.match(html,/<strong>Xin nghỉ trước 2 ngày<\/strong>/);
assert.match(html,/<em>Lời nhắc<\/em>/);
assert.ok(!html.includes('***'));
assert.ok(!html.includes('<script>'));
assert.ok(html.includes('&lt;script&gt;'));
const user=renderToStaticMarkup(<ChatMessageText text={'**Giữ nguyên câu hỏi**'} format={false} />);
assert.ok(user.includes('**Giữ nguyên câu hỏi**'));
console.log('PASS: safe chat emphasis, literal user messages, response length and preserved custom instructions stored in existing text column');
