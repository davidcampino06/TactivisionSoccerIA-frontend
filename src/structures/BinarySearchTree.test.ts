import { describe, expect, it } from "vitest";
import { BinarySearchTree, minimumHeight } from "./BinarySearchTree";

const byNumber = (a: number, b: number) => a - b;

/** Deterministic shuffle so the tests are repeatable. */
function shuffled(size: number, seed = 7): number[] {
  const values = Array.from({ length: size }, (_, index) => index + 1);
  let state = seed;
  for (let index = values.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const other = state % (index + 1);
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function build(values: number[], balanced: boolean) {
  const tree = new BinarySearchTree<number, number>(byNumber, { balanced });
  for (const value of values) tree.insert(value, value);
  return tree;
}

describe("BinarySearchTree", () => {
  it("lists the values from the biggest down (reverse in-order)", () => {
    for (const balanced of [false, true]) {
      const values = shuffled(200);
      const tree = build(values, balanced);
      expect(tree.size).toBe(200);
      expect(tree.descending()).toEqual([...values].sort((a, b) => b - a));
    }
  });

  it("keeps the search property: in-order positions follow the keys", () => {
    const layout = build(shuffled(60), true).layout();
    const keys = layout.map((entry) => entry.node.key);
    expect(keys).toEqual([...keys].sort(byNumber));
    expect(layout.map((entry) => entry.x)).toEqual(keys.map((_, index) => index));
    expect(layout.filter((entry) => entry.parent === null)).toHaveLength(1);
  });

  it("a plain BST fed sorted data becomes a list; AVL stays short", () => {
    const sorted = Array.from({ length: 100 }, (_, index) => index);
    const plain = build(sorted, false);
    const avl = build(sorted, true);
    expect(plain.height()).toBe(100);
    expect(plain.rotations).toBe(0);
    expect(avl.height()).toBeLessThanOrEqual(Math.floor(1.44 * Math.log2(100 + 2)));
    expect(avl.height()).toBeGreaterThanOrEqual(minimumHeight(100));
    expect(avl.rotations).toBeGreaterThan(0);
  });

  it("search path follows one branch per level", () => {
    const tree = build([50, 30, 70, 20, 40, 60, 80], false);
    expect(tree.searchPath(40)).toEqual({ path: [50, 30, 40], found: true });
    expect(tree.searchPath(65)).toEqual({ path: [50, 70, 60], found: false });
  });

  it("range returns the keys inside the bounds and skips subtrees", () => {
    const values = shuffled(500);
    const tree = build(values, true);
    const result = tree.range(480, 490);
    expect(result.values).toEqual([490, 489, 488, 487, 486, 485, 484, 483, 482, 481, 480]);
    expect(result.visited.size).toBeLessThan(60);
    expect(tree.range(1000, 2000).values).toEqual([]);
    expect(tree.range(1, 500).values).toHaveLength(500);
  });

  it("minimum height of a perfectly balanced tree", () => {
    expect([0, 1, 2, 3, 7, 8, 100].map(minimumHeight)).toEqual([0, 1, 2, 2, 3, 4, 7]);
  });
});
