/**
 * Immutable stack (LIFO) built on a singly linked list.
 *
 * push and pop never modify the stack: they return a NEW stack that shares the rest of the
 * nodes with the old one (structural sharing), so both operations are O(1) and old versions
 * stay valid. That fits React state, where values must not be mutated in place.
 *
 *   push(c):  [c] -> [b] -> [a]      the old stack still points to [b] -> [a]
 */

interface StackNode<T> {
  readonly value: T;
  readonly next: StackNode<T> | null;
}

export class Stack<T> {
  private readonly head: StackNode<T> | null;
  readonly size: number;

  private constructor(head: StackNode<T> | null, size: number) {
    this.head = head;
    this.size = size;
  }

  static empty<T>(): Stack<T> {
    return new Stack<T>(null, 0);
  }

  isEmpty(): boolean {
    return this.head === null;
  }

  /** New stack with `value` on top. O(1). */
  push(value: T): Stack<T> {
    return new Stack({ value, next: this.head }, this.size + 1);
  }

  /** Top value and the stack below it. O(1). Throws on an empty stack. */
  pop(): [T, Stack<T>] {
    if (this.head === null) throw new RangeError("Cannot pop an empty stack.");
    return [this.head.value, new Stack(this.head.next, this.size - 1)];
  }

  /** Top value without removing it. */
  peek(): T | undefined {
    return this.head?.value;
  }

  /** Values from the top down (at most `limit`). */
  toArray(limit = Infinity): T[] {
    const values: T[] = [];
    for (let node = this.head; node && values.length < limit; node = node.next) values.push(node.value);
    return values;
  }

  /** Keeps only the `max` values closest to the top (the oldest ones are dropped). O(max). */
  limit(max: number): Stack<T> {
    if (this.size <= max) return this;
    return this.toArray(max).reduceRight<Stack<T>>((stack, value) => stack.push(value), Stack.empty<T>());
  }
}
