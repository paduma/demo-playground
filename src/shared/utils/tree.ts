// 通用树形结构操作工具函数
// 泛型约束：节点必须有 id 和可选的 children 字段
// 所有函数都是纯函数，不修改原始数据

// 树节点基础约束
export interface TreeNodeBase {
  id: string;
  children?: this[];
}

// 深拷贝树节点
export function cloneNode<T extends TreeNodeBase>(node: T): T {
  return {
    ...node,
    children: node.children?.map(child => cloneNode(child as T)) as T['children'],
  };
}

// 在树中查找节点（单根）
export function findInTree<T extends TreeNodeBase>(root: T, id: string): T | null {
  if (root.id === id) return root;
  for (const child of (root.children || []) as T[]) {
    const found = findInTree(child, id);
    if (found) return found;
  }
  return null;
}

// 在树中查找节点（多根）
export function findInForest<T extends TreeNodeBase>(nodes: T[], id: string): T | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findInForest(node.children as T[], id);
      if (found) return found;
    }
  }
  return null;
}

// 在树中查找父节点（单根）
export function findParentInTree<T extends TreeNodeBase>(root: T, id: string): T | null {
  if ((root.children as T[] | undefined)?.some(c => c.id === id)) return root;
  for (const child of (root.children || []) as T[]) {
    const found = findParentInTree(child, id);
    if (found) return found;
  }
  return null;
}

// 在树中查找父节点（多根）
export function findParentInForest<T extends TreeNodeBase>(nodes: T[], id: string): T | null {
  for (const node of nodes) {
    if ((node.children as T[] | undefined)?.some(c => c.id === id)) return node;
    if (node.children) {
      const found = findParentInForest(node.children as T[], id);
      if (found) return found;
    }
  }
  return null;
}

// 获取从根到目标节点的路径（单根）
export function getPathInTree<T extends TreeNodeBase>(root: T, id: string): T[] {
  if (root.id === id) return [root];
  for (const child of (root.children || []) as T[]) {
    const path = getPathInTree(child, id);
    if (path.length) return [root, ...path];
  }
  return [];
}

// 收集所有节点 id（多根）
export function collectAllIds<T extends TreeNodeBase>(nodes: T[]): string[] {
  const ids: string[] = [];
  const walk = (list: T[]) => {
    for (const node of list) {
      ids.push(node.id);
      if (node.children) walk(node.children as T[]);
    }
  };
  walk(nodes);
  return ids;
}

// 不可变更新：对目标节点执行 updater，只拷贝修改路径（多根）
// 未修改的子树保持原引用
export function updateNodeInForest<T extends TreeNodeBase>(
  nodes: T[],
  targetId: string,
  updater: (node: T) => T,
): T[] {
  let changed = false;
  const result = nodes.map(node => {
    if (node.id === targetId) {
      changed = true;
      return updater(node);
    }
    if (node.children) {
      const updatedChildren = updateNodeInForest(node.children as T[], targetId, updater);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren } as T;
      }
    }
    return node;
  });
  return changed ? result : nodes;
}

// 不可变删除节点（单根），未修改的子树保持原引用
export function removeFromTree<T extends TreeNodeBase>(root: T, id: string): T {
  if (!root.children) return root;
  const filtered = (root.children as T[]).filter(c => c.id !== id);
  const mapped = filtered.map(c => removeFromTree(c, id));
  if (mapped.length === root.children.length && mapped.every((c, i) => c === root.children![i])) {
    return root;
  }
  return { ...root, children: mapped } as T;
}

// 不可变删除节点（多根）
export function removeFromForest<T extends TreeNodeBase>(nodes: T[], id: string): T[] {
  let changed = false;
  const result = nodes
    .filter(node => {
      if (node.id === id) { changed = true; return false; }
      return true;
    })
    .map(node => {
      if (!node.children) return node;
      const updatedChildren = removeFromForest(node.children as T[], id);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren } as T;
      }
      return node;
    });
  return changed ? result : nodes;
}

// 搜索匹配的节点及其祖先路径（多根），matcher 返回 true 表示匹配
export function searchMatchedIds<T extends TreeNodeBase>(
  nodes: T[],
  matcher: (node: T) => boolean,
): Set<string> {
  const matched = new Set<string>();
  const walk = (list: T[], ancestors: string[]): boolean => {
    let anyMatch = false;
    for (const node of list) {
      const selfMatch = matcher(node);
      let childMatch = false;
      if (node.children) {
        childMatch = walk(node.children as T[], [...ancestors, node.id]);
      }
      if (selfMatch || childMatch) {
        matched.add(node.id);
        ancestors.forEach(a => matched.add(a));
        anyMatch = true;
      }
    }
    return anyMatch;
  };
  walk(nodes, []);
  return matched;
}
