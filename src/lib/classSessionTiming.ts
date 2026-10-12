export const scheduledClassStart = (date: string, timeRange: string): Date | null => {
  const match = timeRange.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const start = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
};

export const minutesUntilClassEnd = (checkinAt: Date, now: Date) =>
  Math.max(0, Math.ceil((checkinAt.getTime() + 60 * 60 * 1000 - now.getTime()) / 60_000));

export const canEnterClass = (now: Date, scheduledStart: Date) => now >= scheduledStart;

export const canEndClass = (checkinAt: Date, now: Date) => minutesUntilClassEnd(checkinAt, now) === 0;
