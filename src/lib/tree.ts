export function buildTree<T extends { id: string; parentId?: string | null; children?: T[] }>(
  items: T[],
  parentId: string | null = null
): T[] {
  return items
    .filter((item) => item.parentId === parentId)
    .map((item) => ({ ...item, children: buildTree(items, item.id) }));
}
