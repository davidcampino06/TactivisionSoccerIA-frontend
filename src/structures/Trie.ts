/**
 * Trie (prefix tree) used for the instant player search.
 *
 * Each node is one letter; the path from the root spells a word. Every node keeps the values
 * of the words that END there. To search a prefix we walk down one node per letter
 * (O(length of the prefix)) and then collect the values of the subtree below that node,
 * instead of comparing the text against every player of the squad.
 */

class TrieNode<T> {
  readonly children = new Map<string, TrieNode<T>>();
  readonly values = new Set<T>();
}

export interface TrieSearch<T> {
  /** Values of every word that starts with the prefix. */
  matches: Set<T>;
  /** Letters walked from the root (shorter than the prefix when the path breaks). */
  path: string[];
  /** Nodes touched: the walk down plus the subtree collected. */
  visited: number;
  /** False when no word starts with the prefix. */
  found: boolean;
}

/** Lower case without accents or extra spaces: "  José " -> "jose". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export class Trie<T> {
  private readonly root = new TrieNode<T>();
  private nodeCount = 1;
  private wordCount = 0;

  /** Adds a word (normalized) that points to `value`. */
  insert(word: string, value: T): void {
    const clean = normalize(word);
    if (!clean) return;
    let node = this.root;
    for (const letter of clean) {
      let next = node.children.get(letter);
      if (!next) {
        next = new TrieNode<T>();
        node.children.set(letter, next);
        this.nodeCount += 1;
      }
      node = next;
    }
    if (node.values.size === 0) this.wordCount += 1;
    node.values.add(value);
  }

  /** Every value whose word starts with `prefix`. */
  search(prefix: string): TrieSearch<T> {
    const clean = normalize(prefix);
    const path: string[] = [];
    let node = this.root;
    for (const letter of clean) {
      const next = node.children.get(letter);
      if (!next) return { matches: new Set(), path, visited: path.length, found: false };
      path.push(letter);
      node = next;
    }
    const matches = new Set<T>();
    const collected = this.collect(node, matches);
    return { matches, path, visited: path.length + collected, found: true };
  }

  /** Depth-first walk of the subtree; returns how many nodes it visited. */
  private collect(node: TrieNode<T>, into: Set<T>): number {
    let visited = 1;
    node.values.forEach((value) => into.add(value));
    node.children.forEach((child) => {
      visited += this.collect(child, into);
    });
    return visited;
  }

  /** Number of nodes, root included. */
  get size(): number {
    return this.nodeCount;
  }

  /** Number of distinct words stored. */
  get words(): number {
    return this.wordCount;
  }
}

export interface MultiWordSearch<T> {
  matches: Set<T>;
  /** Result of the last word typed (the one shown as a path). */
  last: TrieSearch<T> | null;
  visited: number;
}

/**
 * Searches each word of the query and keeps the values found by ALL of them,
 * so "juan pe" finds "Juan Pérez" but not "Juan Gómez".
 */
export function searchAll<T>(trie: Trie<T>, query: string): MultiWordSearch<T> {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  let matches: Set<T> | null = null;
  let last: TrieSearch<T> | null = null;
  let visited = 0;
  for (const word of words) {
    last = trie.search(word);
    visited += last.visited;
    const current: Set<T> = matches ?? last.matches;
    matches = new Set([...current].filter((value) => last!.matches.has(value)));
  }
  return { matches: matches ?? new Set(), last, visited };
}
