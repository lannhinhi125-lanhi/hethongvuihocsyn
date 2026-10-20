export const CLASS_PAUSE_REASON_CODE = 'CLASS_PAUSE_REASON';
export type PauseCatalog = { code: string; entries: { id: string; name: string; status: boolean }[] };
export type LessonPause = { pausedByClass?: boolean; pauseReason?: string | null; pauseNote?: string | null };

export function pauseReasonName(reason: string | null | undefined, catalogs: PauseCatalog[]): string {
  if (!reason) return 'Chưa ghi nhận lý do';
  return catalogs.find(catalog => catalog.code === CLASS_PAUSE_REASON_CODE)?.entries.find(entry => entry.id === reason)?.name || reason;
}

export function lessonPauseLabel(lesson: LessonPause, catalogs: PauseCatalog[]): string {
  return lesson.pausedByClass ? 'Tạm dừng lớp · ' + pauseReasonName(lesson.pauseReason, catalogs) : '';
}
