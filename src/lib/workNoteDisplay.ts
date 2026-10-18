import type {SessionPayrollRecord} from '../types';

/** Present generated incident notes using the linked lesson's public code.
 * Keep the original note and incident identity intact for payroll updates.
 */
export function workNoteDisplay(session:Pick<SessionPayrollRecord,'hrPayNote'|'incidentId'>,lessonCode:string):string {
 const note=session.hrPayNote||'';
 if(!session.incidentId)return note;
 const marker='('+session.incidentId+')';
 if(!/^Sự cố\s+\S+\s+\(/.test(note)||!note.includes(marker))return note;
 const code=lessonCode && /^BH-\d+$/.test(lessonCode)?' · '+lessonCode:'';
 return note.replace(' '+marker,code);
}
