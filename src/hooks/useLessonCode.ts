import {useMemo,useCallback} from 'react';
import {useBusinessValue} from '../lib/businessPersistence';
export function useLessonCode(){
 const [lessons]=useBusinessValue<{id:string;displayCode?:string}[]>('dated_lessons');
 const codes=useMemo(()=>new Map(lessons.map(lesson=>[lesson.id,lesson.displayCode])),[lessons]);
 return useCallback((id?:string|null)=>id?codes.get(id)||'Chưa cấp mã':'Chưa lưu',[codes]);
}
