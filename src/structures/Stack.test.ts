import { describe, expect, it } from "vitest";
import { Stack } from "./Stack";

describe("Stack (LIFO, immutable)", () => {
  it("returns the last value pushed first", () => {
    const stack = Stack.empty<number>().push(1).push(2).push(3);
    expect(stack.size).toBe(3);
    expect(stack.peek()).toBe(3);
    expect(stack.toArray()).toEqual([3, 2, 1]);

    const [top, rest] = stack.pop();
    expect(top).toBe(3);
    expect(rest.toArray()).toEqual([2, 1]);
  });

  it("never changes an old version (structural sharing)", () => {
    const base = Stack.empty<string>().push("a").push("b");
    const withC = base.push("c");
    const [, popped] = base.pop();
    expect(base.toArray()).toEqual(["b", "a"]);
    expect(withC.toArray()).toEqual(["c", "b", "a"]);
    expect(popped.toArray()).toEqual(["a"]);
  });

  it("fails when popping an empty stack", () => {
    const empty = Stack.empty<number>();
    expect(empty.isEmpty()).toBe(true);
    expect(empty.peek()).toBeUndefined();
    expect(() => empty.pop()).toThrow(RangeError);
  });

  it("limit keeps only the values closest to the top", () => {
    let stack = Stack.empty<number>();
    for (let value = 1; value <= 10; value += 1) stack = stack.push(value);
    const limited = stack.limit(3);
    expect(limited.size).toBe(3);
    expect(limited.toArray()).toEqual([10, 9, 8]);
    expect(stack.limit(20)).toBe(stack);
    expect(stack.toArray(2)).toEqual([10, 9]);
  });
});
