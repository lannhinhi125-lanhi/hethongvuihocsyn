type MaterialRow = { item: { id: string }; week: string; materials: { updatedAt?: string | null }[] };

/** The latest actual update within this class/week, including a just-saved edit. */
export function materialRowUpdateTime(row: MaterialRow, recentUpdates: Record<string, number>): number | undefined {
  const time = Math.max(recentUpdates[`${row.item.id}-${row.week}`] || 0, ...row.materials.map(material => Date.parse(material.updatedAt || '') || 0));
  return time || undefined;
}
