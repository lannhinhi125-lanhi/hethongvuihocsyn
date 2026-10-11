import assert from 'node:assert/strict';
import { PREVIEW_ACCOUNT } from '../src/lib/previewMode';
import { hasPermission, canAccessModule } from '../src/lib/accessControl';
import { permissionModules } from '../src/lib/portalPermissions';
import { canManageTeacherProfiles } from '../src/lib/teacherAccounts';
import { canEditTeacherAvailability } from '../src/lib/teacherAvailability';
import { toSupabaseRow, fromSupabaseRow } from '../src/lib/supabaseMapper';
import type { TeacherProfile } from '../src/types';
for(const modules of Object.values(permissionModules))for(const module of modules){
 assert.equal(canAccessModule(PREVIEW_ACCOUNT,[],module.id),false,module.id);
 for(const feature of module.features)assert.equal(hasPermission(PREVIEW_ACCOUNT,[],feature),false,feature);
}
assert.equal(canAccessModule({...PREVIEW_ACCOUNT,status:'locked'},[],'PH1'),false);
assert.equal(hasPermission({...PREVIEW_ACCOUNT,id:'REAL-USER'},[],'Quản lý danh mục môn học'),false);
assert.equal(hasPermission(PREVIEW_ACCOUNT,[],'UNKNOWN'),false);
assert.equal(canAccessModule(PREVIEW_ACCOUNT,[],'UNKNOWN'),false);
assert.equal(canManageTeacherProfiles(PREVIEW_ACCOUNT,[]),false);
assert.equal(canEditTeacherAvailability(PREVIEW_ACCOUNT,{id:'GV-1'} as TeacherProfile),false);
const nested={'1':{sessionNum:1,status:'Đang học',attendance:{'HS-1':'present'},feedback:{'HS-1':'Tốt'},feedbackCriteria:{'HS-1':{'CRI-1':'OPT-1'}}}};
const encoded=toSupabaseRow('classes',{id:'CLS-1',code:'LOP-1',activeSessions:nested,teacherId:undefined});
assert.deepEqual(encoded,{madinhdanh:'CLS-1',malophoc:'LOP-1',chitietcahoc:nested,magiaovien:null});
assert.deepEqual(fromSupabaseRow('classes',encoded).activeSessions,nested);
assert.throws(()=>toSupabaseRow('teaching_sessions',{subject:'TOAN'}),/dated_lessons/);
assert.throws(()=>fromSupabaseRow('teaching_sessions',{mamonhoc:'SUB-ENG'}),/dated_lessons/);
assert.throws(()=>toSupabaseRow('students',{id:'HS-1',unknownField:1}),/ánh xạ/);
assert.throws(()=>toSupabaseRow('users',PREVIEW_ACCOUNT),/mẫu/);
assert.deepEqual(toSupabaseRow('users',{id:'USR-1',passwordRaw:'secret'}),{madinhdanh:'USR-1'});
console.log('Preview bypass disabled: all admin/teacher features rejected. UI/SQL mappings passed.');
