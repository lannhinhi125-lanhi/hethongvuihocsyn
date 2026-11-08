import type {ClassItem} from '../types';
import type {TeachingLesson} from './teachingSessionDetails';

/** Stop future teaching plans without hiding actual teaching history. */
export function showStoppedClassSession(cls: Pick<ClassItem,'status'>,date:string,time:string,
 lesson:Pick<TeachingLesson,'checkinAt'|'checkoutAt'|'status'|'materials'>|undefined,now=new Date()):boolean {
 if(cls.status!=='Dừng lớp')return true;
 if(lesson?.checkinAt || lesson?.checkoutAt)return true;
 // After cleanup the cancelled lesson has an explicitly empty material
 // projection. Keep it hidden when its scheduled date later becomes history.
 if(['NGHI_HOC','HUY'].includes(lesson?.status||'') && lesson?.materials
  && !Object.values(lesson.materials).some(Boolean))return false;
 const start=time.match(/^\s*(\d{1,2}):(\d{2})/);
 if(!start)return false;
 const at=Date.parse(`${date}T${start[1].padStart(2,'0')}:${start[2]}:00+07:00`);
 return Number.isFinite(at) && at<=now.getTime();
}
