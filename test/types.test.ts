/**
 * Type-level tests for ppipe.
 *
 * This file is NOT part of the runtime test suite - it produces no output and
 * asserts nothing at runtime. Every check here is a compile-time assertion:
 * if this file type-checks, the tests pass.
 *
 * Run with: npm run typecheck:types
 *
 * Two assertion styles are used:
 *   - Expect<Equals<Actual, Expected>>  - exact type identity (no widening,
 *     no `as` casts, and not satisfied by `any`).
 *   - @ts-expect-error                  - the following line MUST fail to
 *     compile; an unused directive is itself an error.
 */

import ppipe, { _ } from "../src/index.js";

// ============================================
// ASSERTION HELPERS
// ============================================

// Invariant-position trick: true only when A and B are identical types.
type Equals<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Guards against the helper silently accepting `any` or unrelated types.
type _SanityTrue = Expect<Equals<number, number>>;
// @ts-expect-error - different types must not be Equals
type _SanityFalse = Expect<Equals<number, string>>;
// @ts-expect-error - `any` must not be Equals to a concrete type
type _SanityAny = Expect<Equals<any, number>>;

// ============================================
// TEST FUNCTIONS
// ============================================

const subtract = (val1: number, val2: number) => val1 - val2;
const fn2 = (a: number, b: string): boolean => a > 0 && b.length > 0;
const fn5 = (a: number, b: string, c: boolean, d: object, e: symbol): bigint => BigInt(a);

// ============================================
// TEST 1: `.value` is exact - no cast, no union
// ============================================
// Previously `.value` was always `T | Promise<T>`, forcing a cast at every
// call site. It now follows the tracked Async flag.

const v1 = ppipe(5).pipe((x: number) => x + 1).value;
type _V1 = Expect<Equals<typeof v1, number>>;

const v2 = ppipe("a").pipe((s: string) => s.length).val;
type _V2 = Expect<Equals<typeof v2, number>>;

// A promise anywhere in the chain makes `.value` a Promise - and only one deep.
const v3 = ppipe(5).pipe(async (x: number) => `${x}`).value;
type _V3 = Expect<Equals<typeof v3, Promise<string>>>;

const v4 = ppipe(Promise.resolve(5)).value;
type _V4 = Expect<Equals<typeof v4, Promise<number>>>;

const v5 = ppipe(Promise.resolve(5)).pipe((x: number) => x + 1).value;
type _V5 = Expect<Equals<typeof v5, Promise<number>>>;

// Async is sticky: once a chain is async it stays async.
const v6 = ppipe(5)
	.pipe(async (x: number) => x + 1)
	.pipe((x: number) => `${x}`).value;
type _V6 = Expect<Equals<typeof v6, Promise<string>>>;

// When the input could be either, `.value` must stay a union - the compiler
// cannot know, and claiming `number` here would be unsound: a Promise at runtime
// would return a Promise from a property typed as a plain number.
declare const maybe: number | Promise<number>;
const v7 = ppipe(maybe).value;
type _V7 = Expect<Equals<typeof v7, number | Promise<number>>>;

const v8 = ppipe(maybe).pipe((x: number) => x + 1).value;
type _V8 = Expect<Equals<typeof v8, number | Promise<number>>>;

// `never` is not a Promise.
const v9 = ppipe(5).pipe((x: number): never => {
	throw new Error(`${x}`);
}).value;
type _V9 = Expect<Equals<typeof v9, never>>;

// Awaiting the pipe directly yields the unwrapped value.
async function awaited() {
	const a1 = await ppipe(5).pipe((x: number) => x + 1);
	type _A1 = Expect<Equals<typeof a1, number>>;

	const a2 = await ppipe(5).pipe(async (x: number) => `${x}`);
	type _A2 = Expect<Equals<typeof a2, string>>;
}

// ============================================
// TEST 2: arity mismatches are rejected
// ============================================
// The result is an ArityMismatch marker; member access on it fails.

const bad1 = ppipe(8).pipe(subtract, _, 3, 5, 10);
// @ts-expect-error - 2-param function called with 4 arguments
const bad1Val = bad1.value;

const bad2 = ppipe(8).pipe(fn2, _, "hello", true, {});
// @ts-expect-error - 2-param function called with 4 arguments
const bad2Val = bad2.value;

const bad3 = ppipe(5).pipe(fn5, _, "a", true, {}, Symbol(), "extra", "args");
// @ts-expect-error - 5-param function called with 7 arguments
const bad3Val = bad3.value;

// A function needing more arguments than were supplied is also rejected.
const bad4 = ppipe(5).pipe(subtract);
// @ts-expect-error - subtract needs 2 arguments, only the piped value is supplied
const bad4Val = bad4.value;

// Argument *types* are checked too, not just counts.
const bad5 = ppipe(5).pipe(fn2, _, 123);
// @ts-expect-error - fn2's second parameter is a string, not a number
const bad5Val = bad5.value;

// The piped value must fit its placeholder position.
const bad6 = ppipe(5).pipe((a: string, b: string) => a + b, _, "x");
// @ts-expect-error - pipe holds a number but the placeholder position takes a string
const bad6Val = bad6.value;

// ============================================
// TEST 3: 1-4 args resolve to exact result types
// ============================================

const t1 = ppipe(5).pipe((x: number) => x + 1).value;
type _T1 = Expect<Equals<typeof t1, number>>;

const t2 = ppipe(5).pipe((a: number, b: string) => `${a}-${b}`, _, "test").value;
type _T2 = Expect<Equals<typeof t2, string>>;

const t3 = ppipe(5).pipe((a: number, b: string, c: boolean) => a + b.length + (c ? 1 : 0), _, "test", true).value;
type _T3 = Expect<Equals<typeof t3, number>>;

const t4 = ppipe(5).pipe((a: number, b: string, c: string, d: string) => `${a}-${b}-${c}-${d}`, _, "b", "c", "d").value;
type _T4 = Expect<Equals<typeof t4, string>>;

const t5 = ppipe(5).pipe(subtract, _, 3).value;
type _T5 = Expect<Equals<typeof t5, number>>;

const t6 = ppipe(5).pipe(fn2, _, "hello").value;
type _T6 = Expect<Equals<typeof t6, boolean>>;

// Placeholder in the trailing position.
const t7 = ppipe(5).pipe((a: string, b: number) => `${a}${b}`, "x", _).value;
type _T7 = Expect<Equals<typeof t7, string>>;

// Repeated placeholder - the value is substituted at each position.
const t8 = ppipe(5).pipe((a: number, b: number) => a + b, _, _).value;
type _T8 = Expect<Equals<typeof t8, number>>;

// Two placeholders straddling a fixed argument of a different type.
// This exercises the 4-arg {0,2} overload, whose `b` and `d` parameters were
// previously forced to share a single type parameter.
const t9 = ppipe(5).pipe((a: number, b: string, c: number, d: boolean) => `${a}${b}${c}${d}`, _, "x", _, true).value;
type _T9 = Expect<Equals<typeof t9, string>>;

// ============================================
// TEST 4: no-placeholder form appends the value last
// ============================================

const n1 = ppipe("hello").pipe((prefix: string, val: string) => `${prefix}: ${val}`, "Result").value;
type _N1 = Expect<Equals<typeof n1, string>>;

const n2 = ppipe(3).pipe((a: string, b: boolean, val: number) => val, "x", true).value;
type _N2 = Expect<Equals<typeof n2, number>>;

// ============================================
// TEST 5: 5+ args via the variadic fallback
// ============================================

const f1 = ppipe(5).pipe(fn5, _, "a", true, {}, Symbol()).value;
type _F1 = Expect<Equals<typeof f1, bigint>>;

const f2 = ppipe(5).pipe((a: number, b: string, c: boolean, d: object, e: symbol) => `${a}-${b}`, _, "a", true, {}, Symbol()).value;
type _F2 = Expect<Equals<typeof f2, string>>;

// Variadic (rest-parameter) functions are allowed through the arity check.
const f3 = ppipe(5).pipe((...nums: number[]) => nums.length, _, 1, 2, 3, 4).value;
type _F3 = Expect<Equals<typeof f3, number>>;

// ============================================
// TEST 6: chaining preserves exact types
// ============================================

const chain = ppipe(5)
	.pipe((x: number) => x * 2)
	.pipe((a: number, b: number) => a + b, _, 10)
	.pipe(subtract, _, 5)
	.pipe(fn5, _, "a", true, {}, Symbol())
	.pipe((x: bigint) => x.toString()).value;
type _Chain = Expect<Equals<typeof chain, string>>;

// ============================================
// TEST 7: extensions must accept the pipe's value type
// ============================================

const ext = ppipe.extend({
	double: (v: number) => v * 2,
	upper: (v: string) => v.toUpperCase(),
	addTo: (v: number, n: number) => v + n,
	slow: async (v: number) => v + 1,
});

const e1 = ext(5).double().value;
type _E1 = Expect<Equals<typeof e1, number>>;

const e2 = ext("hi").upper().value;
type _E2 = Expect<Equals<typeof e2, string>>;

const e3 = ext(5).addTo(3).value;
type _E3 = Expect<Equals<typeof e3, number>>;

// An async extension makes the chain async.
const e4 = ext(5).slow().value;
type _E4 = Expect<Equals<typeof e4, Promise<number>>>;

// Extensions chain, and stay available across `.pipe()` calls.
const e5 = ext(5)
	.double()
	.pipe((x: number) => x + 1)
	.addTo(2).value;
type _E5 = Expect<Equals<typeof e5, number>>;

// An extension is not offered on a pipe whose value it cannot accept.
// Previously these compiled and then threw (or produced NaN) at runtime.
// @ts-expect-error - `upper` takes a string; this pipe holds a number
ext(5).upper();
// @ts-expect-error - `double` takes a number; this pipe holds a string
ext("hi").double();
// @ts-expect-error - `addTo` takes a number; this pipe holds an object
ext({ a: 1 }).addTo(1);

// Extension argument types are checked.
// @ts-expect-error - `addTo` takes a number argument
ext(5).addTo("3");

// ============================================
// TEST 8: generic pass-through extensions keep the pipe's type
// ============================================

const tapped = ppipe.extend({ tap: <G>(v: G): G => v });

const g1 = tapped(5).tap().value;
type _G1 = Expect<Equals<typeof g1, number>>;

const g2 = tapped("hi").tap().value;
type _G2 = Expect<Equals<typeof g2, string>>;

const g3 = tapped({ a: 1 }).tap().pipe((o: { a: number }) => o.a).value;
type _G3 = Expect<Equals<typeof g3, number>>;

// ============================================
// TEST 9: extend() overrides same-named extensions
// ============================================
// The runtime spread lets the later definition win; the types now say so.

const base = ppipe.extend({ f: (v: number, n: number) => v + n });
const overridden = base.extend({ f: (v: number) => v.toString() });

const o1 = overridden(5).f().value;
type _O1 = Expect<Equals<typeof o1, string>>;

// @ts-expect-error - the overriding `f` takes no extra arguments
overridden(5).f(1);

// Non-overridden extensions survive the merge.
const merged = ppipe.extend({ a: (v: number) => v + 1 }).extend({ b: (v: number) => `${v}` });
const o2 = merged(5).a().value;
type _O2 = Expect<Equals<typeof o2, number>>;
const o3 = merged(5).b().value;
type _O3 = Expect<Equals<typeof o3, string>>;

// ============================================
// TEST 10: then() / catch()
// ============================================

const p1 = ppipe(5).pipe(async (x: number) => x + 1).then((v) => `${v}`);
type _P1 = Expect<Equals<typeof p1, Promise<string>>>;

// The fulfilment callback receives the unwrapped value.
ppipe(5)
	.pipe(async (x: number) => x + 1)
	.then((v) => {
		type _PV = Expect<Equals<typeof v, number>>;
		return v;
	});

const p2 = ppipe(5).catch(() => "fallback");
type _P2 = Expect<Equals<typeof p2, Promise<string | number>>>;

// ============================================
// TEST 11: non-function extension members are not exposed as methods
// ============================================

const withData = ppipe.extend({ notAFn: 42, real: (v: number) => v + 1 });

const d1 = withData(5).real().value;
type _D1 = Expect<Equals<typeof d1, number>>;

// @ts-expect-error - `notAFn` is not a function, so it is not a pipe method
withData(5).notAFn();

// ============================================
// TEST 12: zero-parameter functions are accepted (deliberate)
// ============================================
// `.pipe(fn)` calls fn with the current value. A function that ignores it is
// valid and idiomatic - used for side effects and for throwing/rejecting.
// This is standard TS function assignability, and the runtime suite relies on it.

const z1 = ppipe(5).pipe(() => 42).value;
type _Z1 = Expect<Equals<typeof z1, number>>;

const z2 = ppipe(5).pipe(() => Promise.reject(new Error("boom"))).value;
type _Z2 = Expect<Equals<typeof z2, Promise<never>>>;

// ============================================
// TEST 13: overloaded functions - known limitation
// ============================================
// Parameters<Fn> / ReturnType<Fn> only see the LAST overload signature, so an
// overloaded function resolves against that one. This is pinned here so the
// documented behaviour cannot drift silently.

function over(a: number, b: number): number;
function over(a: string, b: string): string;
function over(a: unknown, b: unknown): unknown {
	return a;
}

const ov1 = ppipe(5).pipe(over, _, 3).value;
// Note: `string`, NOT `number` - inferred from the last overload.
type _OV1 = Expect<Equals<typeof ov1, string>>;

// The documented workaround - wrap in a lambda to pin the intended signature.
const ov2 = ppipe(5).pipe((a: number) => over(a, 3)).value;
type _OV2 = Expect<Equals<typeof ov2, number>>;

// ============================================
// TEST 14: the placeholder is opaque
// ============================================

// @ts-expect-error - the placeholder brand cannot be forged from a plain object
const fake: typeof _ = {};
