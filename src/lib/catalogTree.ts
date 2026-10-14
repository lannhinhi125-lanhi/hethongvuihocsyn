export interface TreeOption { id: string; label: string; parentId?: string }

/** Preserve catalog order while rendering any number of levels. */
export function catalogTree<T extends TreeOption>(options: T[]) {
  const result: (T & { depth: number; treeLabel: string })[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | undefined, depth: number) => {
    for (const option of options.filter(item => (item.parentId || undefined) === parentId)) {
      if (seen.has(option.id)) throw new Error('Danh mục có vòng lặp.');
      seen.add(option.id);
      result.push({ ...option, depth, treeLabel: `${'-'.repeat(depth)} ${option.label}` });
      visit(option.id, depth + 1);
    }
  };
  visit(undefined, 1);
  if (seen.size !== options.length) throw new Error('Danh mục thiếu mục cha hoặc có vòng lặp.');
  return result;
}

export function parseCatalogTree(text: string, existing: TreeOption[] = []): TreeOption[] {
  const result: TreeOption[] = [];
  const parents: TreeOption[] = [];
  for (const line of text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const match = line.match(/^(-+)\s+(.+)$/);
    const depth = match ? match[1].length : 1;
    const label = (match ? match[2] : line).trim();
    if (depth > parents.length + 1) throw new Error('Cấp con phải nằm ngay dưới cấp cha.');
    const parentId = depth > 1 ? parents[depth - 2]?.id : undefined;
    if (result.some(item => item.label === label && item.parentId === parentId)) throw new Error('Tên mục trong cùng cấp cha bị trùng.');
    const old = existing.find(item => item.label === label && item.parentId === parentId);
    const id = old?.id || (depth === 1 && !existing.some(item => item.id === label) ? label : crypto.randomUUID());
    const option = { id, label, ...(parentId ? { parentId } : {}) };
    result.push(option);
    parents[depth - 1] = option;
    parents.length = depth;
  }
  return result;
}
