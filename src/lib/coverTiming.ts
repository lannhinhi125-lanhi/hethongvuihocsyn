/** Cover closes at the scheduled end in Vietnam time, independent of attendance. */
export function canAssignCover(session: {sessionDate:string;timeSlot:string}, now = new Date()): boolean {
  const match = session.timeSlot.match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(session.sessionDate)) return false;
  const [sh,sm,eh,em] = match.slice(1).map(Number);
  if (sh>23 || eh>23 || sm>59 || em>59) return false;
  const end = new Date(`${session.sessionDate}T${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:00+07:00`);
  if (eh*60+em < sh*60+sm) end.setUTCDate(end.getUTCDate()+1);
  return Number.isFinite(end.getTime()) && now.getTime() < end.getTime();
}
