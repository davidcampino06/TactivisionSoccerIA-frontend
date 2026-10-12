/**
 * Binary search tree (BST) used for the player ranking, with optional AVL balancing.
 *
 * Every node has at most two children: everything in the LEFT subtree is smaller than the node
 * and everything in the RIGHT subtree is bigger. That single rule gives us:
 *
 *   insert / find       O(h)      walk down one level per comparison (h = height of the tree)
 *   ranking             O(n)      reverse in-order traversal (right, node, left) = biggest first
 *   range [low, high]   O(h + k)  skip whole subtrees that cannot hold values in the range
 *
 * A plain BST is only fast when it stays short: if values arrive almost sorted, h grows towards n
 * and the tree behaves like a linked list. With `balanced: true` it is an AVL tree: after each
 * insertion, any node whose two subtrees differ in height by more than 1 is fixed with rotations,
 * so h stays below 1.44 · log2(n). The app shows both heights to compare them.
 */

export type Compare<K> = (a: K, b: K) => number;

export interface TreeNode<K, V> {
  key: K;
  value: V;
  left: TreeNode<K, V> | null;
  right: TreeNode<K, V> | null;
  /** Levels of the subtree that starts here (a leaf = 1). */
  height: number;
}

export interface RangeResult<V> {
  /** Values inside the range, biggest first. */
  values: V[];
  /** Nodes actually visited: fewer than the size when subtrees are skipped. */
  visited: Set<V>;
}

export interface LayoutNode<K, V> {
  node: TreeNode<K, V>;
  parent: TreeNode<K, V> | null;
  /** In-order position: drawing x = position never crosses edges. */
  x: number;
  depth: number;
}

const heightOf = <K, V>(node: TreeNode<K, V> | null): number => (node ? node.height : 0);

export class BinarySearchTree<K, V> {
  private root: TreeNode<K, V> | null = null;
  private count = 0;
  private rotationCount = 0;
  private readonly compare: Compare<K>;
  private readonly balanced: boolean;

  constructor(compare: Compare<K>, options: { balanced?: boolean } = {}) {
    this.compare = compare;
    this.balanced = options.balanced ?? false;
  }

  get size(): number {
    return this.count;
  }

  /** Rotations done by the AVL balancing so far (always 0 for a plain BST). */
  get rotations(): number {
    return this.rotationCount;
  }

  /** Adds a node; equal keys go to the right (the comparator should make keys unique). O(h). */
  insert(key: K, value: V): void {
    this.root = this.insertAt(this.root, key, value);
    this.count += 1;
  }

  private insertAt(node: TreeNode<K, V> | null, key: K, value: V): TreeNode<K, V> {
    if (!node) return { key, value, left: null, right: null, height: 1 };
    if (this.compare(key, node.key) < 0) node.left = this.insertAt(node.left, key, value);
    else node.right = this.insertAt(node.right, key, value);
    this.update(node);
    return this.balanced ? this.rebalance(node) : node;
  }

  private update(node: TreeNode<K, V>): void {
    node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
  }

  private balanceFactor(node: TreeNode<K, V>): number {
    return heightOf(node.left) - heightOf(node.right);
  }

  /** AVL: left-left, left-right, right-right and right-left cases. */
  private rebalance(node: TreeNode<K, V>): TreeNode<K, V> {
    const factor = this.balanceFactor(node);
    if (factor > 1) {
      if (this.balanceFactor(node.left!) < 0) node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }
    if (factor < -1) {
      if (this.balanceFactor(node.right!) > 0) node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }
    return node;
  }

  private rotateRight(node: TreeNode<K, V>): TreeNode<K, V> {
    const pivot = node.left!;
    node.left = pivot.right;
    pivot.right = node;
    this.update(node);
    this.update(pivot);
    this.rotationCount += 1;
    return pivot;
  }

  private rotateLeft(node: TreeNode<K, V>): TreeNode<K, V> {
    const pivot = node.right!;
    node.right = pivot.left;
    pivot.left = node;
    this.update(node);
    this.update(pivot);
    this.rotationCount += 1;
    return pivot;
  }

  /** The nodes compared while looking for `key`, from the root down. O(h). */
  searchPath(key: K): { path: V[]; found: boolean } {
    const path: V[] = [];
    let current = this.root;
    while (current) {
      path.push(current.value);
      const order = this.compare(key, current.key);
      if (order === 0) return { path, found: true };
      current = order < 0 ? current.left : current.right;
    }
    return { path, found: false };
  }

  /** Biggest first: right subtree, node, left subtree. O(n). */
  descending(): V[] {
    const out: V[] = [];
    const walk = (node: TreeNode<K, V> | null) => {
      if (!node) return;
      walk(node.right);
      out.push(node.value);
      walk(node.left);
    };
    walk(this.root);
    return out;
  }

  /** Values with low <= key <= high, biggest first, and the nodes visited to find them. O(h + k). */
  range(low: K, high: K): RangeResult<V> {
    const values: V[] = [];
    const visited = new Set<V>();
    const walk = (node: TreeNode<K, V> | null) => {
      if (!node) return;
      visited.add(node.value);
      const aboveLow = this.compare(node.key, low) >= 0;
      const belowHigh = this.compare(node.key, high) <= 0;
      if (belowHigh) walk(node.right); // bigger keys can only be on the right
      if (aboveLow && belowHigh) values.push(node.value);
      if (aboveLow) walk(node.left); // smaller keys can only be on the left
    };
    walk(this.root);
    return { values, visited };
  }

  /** Levels of the longest root-to-leaf path (empty tree = 0). O(1): kept in every node. */
  height(): number {
    return heightOf(this.root);
  }

  /** Every node with its in-order position and depth, to draw the tree without crossings. */
  layout(): LayoutNode<K, V>[] {
    const out: LayoutNode<K, V>[] = [];
    const walk = (node: TreeNode<K, V> | null, parent: TreeNode<K, V> | null, depth: number) => {
      if (!node) return;
      walk(node.left, node, depth + 1);
      out.push({ node, parent, x: out.length, depth });
      walk(node.right, node, depth + 1);
    };
    walk(this.root, null, 0);
    return out;
  }
}

/** Smallest possible height for n nodes (a perfectly balanced tree). */
export const minimumHeight = (size: number): number => (size === 0 ? 0 : Math.ceil(Math.log2(size + 1)));
