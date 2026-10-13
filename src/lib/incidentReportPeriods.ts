import { reportCreationDate } from './reportCreationDate';

export interface ReportLesson {
  id: string;
  date: string;
}

export interface ReportIncident {
  lessonId: string;
  incidentName?: string;
  urgency?: string | null;
  reportedAt?: string | null;
}

export function incidentReportPeriods(
  lessons: ReportLesson[],
  incidents: ReportIncident[],
  range: { start: string; end: string } = { start: '', end: '' }
) {
  const lessonDates = new Map(lessons.map(lesson => [lesson.id, lesson.date]));
  const inRange = (date: string) => Boolean(date) && (!range.start || date >= range.start) && (!range.end || date <= range.end);
  const events = incidents.map(incident => ({
    ...incident,
    date: incident.reportedAt ? reportCreationDate(incident.reportedAt) : lessonDates.get(incident.lessonId) || ''
  })).filter(event => inRange(event.date));
  const months = [...new Set([
    ...lessons.filter(lesson => inRange(lesson.date)).map(lesson => lesson.date.slice(0, 7)),
    ...events.map(event => event.date.slice(0, 7))
  ])].sort().reverse();
  return months.map(month => {
    const periodLessons = lessons.filter(lesson => inRange(lesson.date) && lesson.date.startsWith(month));
    const periodEvents = events.filter(event => event.date.startsWith(month));
    const affectedLessons = new Set(periodEvents.map(event => event.lessonId));
    const urgentLessons = new Set(periodEvents.filter(event => event.urgency === 'EMERGENCY').map(event => event.lessonId));
    const urgent = urgentLessons.size;
    const notice = affectedLessons.size - urgent;
    const rate = periodLessons.length ? Number((affectedLessons.size / periodLessons.length * 100).toFixed(2)) : 0;
    const counts = new Map<string, number>();
    for (const event of periodEvents) {
      const name = event.incidentName?.trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    const main = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Chưa ghi nhận sự cố';
    const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
    return {
      period: month, periodCode: month, dateFrom: month + '-01', dateTo: month + '-' + lastDay,
      total: periodLessons.length, incidents: affectedLessons.size, urgent, notice,
      rate, rateStr: rate + '%', main
    };
  });
}
