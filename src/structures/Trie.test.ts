import { describe, expect, it } from "vitest";
import { normalize, searchAll, Trie } from "./Trie";

const squad = [
  { id: 1, name: "Juan Pérez" },
  { id: 2, name: "Juan Gómez" },
  { id: 3, name: "José Ángel Muñoz" },
  { id: 4, name: "Andrés Pereira" },
];

function build() {
  const trie = new Trie<number>();
  for (const player of squad) for (const word of player.name.split(" ")) trie.insert(word, player.id);
  return trie;
}

describe("Trie (prefix tree)", () => {
  it("normalizes accents, case and spaces", () => {
    expect(normalize("  José ÁNGEL ")).toBe("jose angel");
    expect(normalize("Muñoz")).toBe("munoz");
  });

  it("finds every word that starts with a prefix", () => {
    const trie = build();
    const result = trie.search("Pe");
    expect(result.found).toBe(true);
    expect(result.path).toEqual(["p", "e"]);
    expect([...result.matches].sort()).toEqual([1, 4]);
    expect([...trie.search("jos").matches]).toEqual([3]);
    expect([...trie.search("ANGEL").matches]).toEqual([3]);
  });

  it("stops where the path breaks", () => {
    const result = build().search("pex");
    expect(result.found).toBe(false);
    expect(result.path).toEqual(["p", "e"]);
    expect(result.matches.size).toBe(0);
  });

  it("visits only the subtree of the prefix, not the whole tree", () => {
    const trie = build();
    expect(trie.search("gomez").visited).toBeLessThan(trie.size);
    expect(trie.search("").visited).toBe(trie.size);
  });

  it("counts nodes and distinct words", () => {
    const trie = new Trie<string>();
    trie.insert("ana", "a");
    trie.insert("ana", "b");
    trie.insert("an", "c");
    trie.insert("   ", "ignored");
    expect(trie.words).toBe(2);
    expect(trie.size).toBe(4);
    expect([...trie.search("ana").matches].sort()).toEqual(["a", "b"]);
  });

  it("several words keep only the players that match all of them", () => {
    const trie = build();
    expect([...searchAll(trie, "juan pe").matches]).toEqual([1]);
    expect([...searchAll(trie, "juan").matches].sort()).toEqual([1, 2]);
    expect(searchAll(trie, "juan zz").matches.size).toBe(0);
    expect(searchAll(trie, "   ").matches.size).toBe(0);
  });
});
