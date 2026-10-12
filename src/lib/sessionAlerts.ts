export const hasSessionStartPassed = (sessionDate: string, timeSlot: string, now: Date, effectiveTime?: string) => {
  const start = timeSlot.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return false;
  const startHour = Number(start[1]);
  const startMinute = Number(start[2]);
  if (startHour > 23 || startMinute > 59) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (sessionDate !== today) return sessionDate < today;
  const time = effectiveTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [hour, minute] = time.split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) && hour * 60 + minute >= startHour * 60 + startMinute;
};
