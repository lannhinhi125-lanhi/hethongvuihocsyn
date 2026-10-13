/** Return the calendar day on which a record was created in the business timezone. */
export function reportCreationDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) return createdAt;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
