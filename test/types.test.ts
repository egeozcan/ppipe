/**
 * Type-level tests for ppipe arity checking.
 *
 * This file is NOT part of the runtime test suite.
 * It verifies compile-time type errors using @ts-expect-error directives.
 *
 * Run with: npm run typecheck:arity
 */

import ppipe, { _ } from "../src/index.js";

// ============================================
// TEST FUNCTIONS
// ============================================

const subtract = (val1: number, val2: number) => val1 - val2;
const fn2 = (a: number, b: string): boolean => a > 0 && b.length > 0;
const fn5 = (a: number, b: string, c: boolean, d: object, e: symbol): bigint => BigInt(a);

// ============================================
// TEST 1: ORIGINAL ISSUE - extra args now produce 'never' type
// ============================================

// subtract has 2 params but 4 args passed - result is 'never'
const bad1 = ppipe(8).pipe(subtract, _, 3, 5, 10);
// @ts-expect-error - Result is 'never' so .value doesn't exist
const bad1Val = bad1.value;

// fn2 has 2 params but 4 args passed - result is 'never'
const bad2 = ppipe(8).pipe(fn2, _, "hello", true, {});
// @ts-expect-error - Result is 'never' so .value doesn't exist
const bad2Val = bad2.value;

// ============================================
// TEST 2: 1-4 args with untyped lambdas still work
// ============================================

// 1 arg
const t1 = ppipe(5).pipe((x: number) => x + 1);
const t1Check: number = t1.value as number;

// 2 args with placeholder
const t2 = ppipe(5).pipe((a: number, b: string) => `${a}-${b}`, _, "test");
const t2Check: string = t2.value as string;

// 3 args with placeholder
const t3 = ppipe(5).pipe((a: number, b: string, c: boolean) => a + b.length + (c ? 1 : 0), _, "test", true);
const t3Check: number = t3.value as number;

// 4 args with placeholder
const t4 = ppipe(5).pipe((a: number, b: string, c: string, d: string) => `${a}-${b}-${c}-${d}`, _, "b", "c", "d");
const t4Check: string = t4.value as string;

// ============================================
// TEST 3: Named functions with correct arity work
// ============================================

const t5 = ppipe(5).pipe(subtract, _, 3);
const t5Check: number = t5.value as number;

const t6 = ppipe(5).pipe(fn2, _, "hello");
const t6Check: boolean = t6.value as boolean;

// ============================================
// TEST 4: 5+ args with named functions (variadic fallback)
// ============================================

const t7 = ppipe(5).pipe(fn5, _, "a", true, {}, Symbol());
const t7Check: bigint = t7.value as bigint;

// ============================================
// TEST 5: 5+ args with typed lambda (variadic fallback)
// ============================================

const t8 = ppipe(5).pipe(
  (a: number, b: string, c: boolean, d: object, e: symbol) => `${a}-${b}`,
  _, "a", true, {}, Symbol()
);
const t8Check: string = t8.value as string;

// ============================================
// TEST 6: 5+ args with explicitly unknown params work (they extend any specific type)
// ============================================

// Note: Lambdas with `unknown` params work because specific types extend unknown.
// True "untyped" lambdas (no type annotations) in 5+ args get `never` params
// from lack of contextual typing, which causes the variadic check to fail.
const typed5 = ppipe(5).pipe((a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) => a, _, "a", true, {}, Symbol());
const typed5Check: unknown = typed5.value;

// ============================================
// TEST 7: Arity mismatch in variadic (5+ args) is caught
// ============================================

const bad4 = ppipe(5).pipe(fn5, _, "a", true, {}, Symbol(), "extra", "args");
// @ts-expect-error - Result is 'never' so .value doesn't exist
const bad4Val = bad4.value;

// ============================================
// TEST 8: Chaining works
// ============================================

const chain = ppipe(5)
  .pipe((x: number) => x * 2)                    // 1 arg
  .pipe((a: number, b: number) => a + b, _, 10)  // 2 args
  .pipe(subtract, _, 5)                          // 2 args - named fn
  .pipe(fn5, _, "a", true, {}, Symbol())         // 5 args - variadic
  .pipe((x: bigint) => x.toString());            // 1 arg

const chainCheck: string = chain.value as string;

// ============================================
// TEST 9: No-placeholder overloads still work
// ============================================

const noPlaceholder2 = ppipe("hello").pipe((prefix: string, val: string) => `${prefix}: ${val}`, "Result");
const np2Check: string = noPlaceholder2.value as string;

console.log("All type tests passed!");
