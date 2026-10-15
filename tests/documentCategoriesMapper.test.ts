import assert from 'node:assert/strict';
import {fromSupabaseRow,toSupabaseRow} from '../src/lib/supabaseMapper';
const category=fromSupabaseRow('document_categories',{madinhdanh:'TYPE-A',tenloai:'Custom type',mota:'',danghoatdong:true});
assert.deepEqual(category,{id:'TYPE-A',name:'Custom type',description:'',isActive:true});
assert.equal(toSupabaseRow('document_categories',category).tenloai,'Custom type');
const doc=fromSupabaseRow('sop_documents',{madinhdanh:'DOC-A',maloaitailieu:'TYPE-A',tenloaitailieu:'Custom type',tieude:'Title'});
assert.equal(doc.categoryId,'TYPE-A');assert.equal(doc.category,'Custom type');
assert.deepEqual(toSupabaseRow('sop_documents',doc),{madinhdanh:'DOC-A',maloaitailieu:'TYPE-A',tieude:'Title'});
console.log('PASS: document category FK is written; display name is SELECT-only; custom catalog rows roundtrip');
