import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StudentSchedulePicker} from '../src/components/StudentSchedulePicker';
const html=renderToStaticMarkup(<StudentSchedulePicker
 slots={[{id:'SLOT',code:'EVENING',name:'Ca tối',timeRange:'18:00 - 19:30',durationMinutes:90,status:true}]}
 selected={['T2 (18:00 - 19:30)','T3 (18:00 - 19:30)']}
 lockedSlots={{'T2 (18:00 - 19:30)':'CLASS-01'}} onToggle={()=>{}} onRemove={()=>{}} onClear={()=>{}}
/>);
assert.doesNotMatch(html,/<fieldset[^>]*\sdisabled="/,'the whole schedule must remain editable');
const inputs=Array.from(html.matchAll(/<input\b[^>]*>/g),m=>m[0]);
assert.equal(inputs.length,7);
assert.match(inputs.find(input=>input.includes('aria-label="T2 '))!,/\sdisabled="/,'occupied selected slot is locked');
assert.doesNotMatch(inputs.find(input=>input.includes('aria-label="T3 '))!,/\sdisabled="/,'unrelated selected slot can be removed');
assert.doesNotMatch(inputs.find(input=>input.includes('aria-label="T4 '))!,/\sdisabled="/,'new availability can be added');
assert.match(html,/CLASS-01/);
assert.match(html,/Bỏ các ca chưa gắn lớp/);
console.log('PASS: availability grid locks only occupied preferences and keeps unrelated/new slots editable');
