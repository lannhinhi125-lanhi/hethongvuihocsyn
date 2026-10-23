import assert from 'node:assert/strict';
import {fromSupabaseRow,toSupabaseRow} from '../src/lib/supabaseMapper';
const category=fromSupabaseRow('document_categories',{madinhdanh:'TYPE-A',tenloai:'Custom type',mota:'',danghoatdong:true});
assert.deepEqual(category,{id:'TYPE-A',name:'Custom type',description:'',isActive:true});
assert.equal(toSupabaseRow('document_categories',category).tenloai,'Custom type');
const doc=fromSupabaseRow('sop_documents',{madinhdanh:'DOC-A',maloaitailieu:'TYPE-A',tenloaitailieu:'Custom type',tieude:'Title'});
assert.equal(doc.categoryId,'TYPE-A');assert.equal(doc.category,'Custom type');
assert.deepEqual(toSupabaseRow('sop_documents',doc),{madinhdanh:'DOC-A',maloaitailieu:'TYPE-A',tieude:'Title'});
console.log('PASS: document category FK is written; display name is SELECT-only; custom catalog rows roundtrip');
const linked = fromSupabaseRow('sop_documents', {
  madinhdanh:'DRIVE-DOC', maloaitailieu:'TYPE-A', tenloaitailieu:'Custom type',
  linkdrive:'https://drive.google.com/file/d/example/view', noidung:''
});
assert.equal(linked.driveUrl,'https://drive.google.com/file/d/example/view');
const stored = toSupabaseRow('sop_documents',linked);
assert.equal(stored.linkdrive,linked.driveUrl);
assert.equal('tenloaitailieu' in stored,false);
const {findKnowledgeDocument} = await import('../src/lib/knowledgeSearch');
assert.equal(findKnowledgeDocument('quy che',[{
  id:'LINK',title:'quy che',category:'Custom type',summary:'',content:'',updatedAt:'',driveUrl:linked.driveUrl
}]),undefined);
console.log('PASS: Drive link roundtrip; link-only documents are not treated as extracted knowledge');
const attributed=fromSupabaseRow('sop_documents',{madinhdanh:'UPLOAD',manguoitailen:'USER-A',tennguoitailen:'Người tải'});
assert.equal(attributed.uploadedBy,'USER-A');assert.equal(attributed.uploaderName,'Người tải');
assert.deepEqual(toSupabaseRow('sop_documents',attributed),{madinhdanh:'UPLOAD'});
console.log('PASS: uploader metadata is displayed and excluded from client writes');
