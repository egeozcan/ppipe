import { assert } from "chai";
import ppipe, { isPlaceholder, _ as exportedPlaceholder } from "../src/index.js";

function doubleSay(str: string): string {
	return str + ", " + str;
}

function capitalize(str: string): string {
	return str[0]!.toUpperCase() + str.substring(1);
}

function delay<T extends (...args: never[]) => unknown>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return function (...args: Parameters<T>): Promise<ReturnType<T>> {
		return new Promise((resolve) => setTimeout(() => resolve(fn(...args) as ReturnType<T>), 10));
	};
}

function exclaim(str: string): string {
	return str + "!";
}

function join(...args: string[]): string {
	return args.join(", ");
}

function quote(str: string): string {
	return '"' + str + '"';
}

const _ = ppipe._;

describe("ppipe (TypeScript rewrite)", () => {
	const message = "hello";

	// ==========================================
	// Basic Piping
	// ==========================================

	describe("basic piping", () => {
		it("should correctly pass the params to the first fn", () => {
			assert.equal(ppipe(message).pipe(doubleSay).value, doubleSay(message));
		});

		it("should correctly pass the params to the second fn", () => {
			assert.equal(ppipe(message).pipe(doubleSay).pipe(exclaim).value, exclaim(doubleSay(message)));
		});

		it("should support using .val as alias for .value", () => {
			assert.equal(ppipe(message).pipe(doubleSay).val, doubleSay(message));
		});
	});

	// ==========================================
	// Placeholder Positioning
	// ==========================================

	describe("placeholder positioning", () => {
		it("should correctly insert parameters with placeholder at first position", () => {
			const join2 = (a: string, b: string): string => [a, b].join(", ");

			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join2, _, "I said").pipe(exclaim).value,
				exclaim(join2(doubleSay(message), "I said"))
			);
		});

		it("should append value at end when no placeholder exists", () => {
			const join2 = (a: string, b: string): string => [a, b].join(", ");

			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join2, "I said").pipe(exclaim).value,
				exclaim(join2("I said", doubleSay(message)))
			);
		});

		it("should correctly insert parameters on multiple functions", () => {
			const join2 = (a: string, b: string): string => [a, b].join(", ");
			const join3 = (a: string, b: string, c: string): string => [a, b, c].join(", ");

			assert.equal(
				ppipe(message)
					.pipe(doubleSay)
					.pipe(join2, _, "I said")
					.pipe(exclaim)
					.pipe(join3, "and suddenly", _, "without thinking").value,
				join3("and suddenly", exclaim(join2(doubleSay(message), "I said")), "without thinking")
			);
		});

		it("should be able to insert value more than once with multiple placeholders", () => {
			const addBoth = (a: number, b: number): number => a + b;

			assert.equal(ppipe(5).pipe(addBoth, _, _).value, 10);
		});
	});

	// ==========================================
	// Error Handling
	// ==========================================

	describe("error handling", () => {
		it("should throw if accessing value from a pipe that contains an error", () => {
			let caught = false;

			try {
				void ppipe(message)
					.pipe(() => {
						throw new Error("foo");
					})
					.pipe(doubleSay).value;
			} catch (error) {
				caught = (error as Error).message === "foo";
			}

			assert.equal(caught, true);
		});

		it("should propagate errors through the chain", () => {
			let caught = false;

			try {
				void ppipe(message)
					.pipe(() => {
						throw new Error("test error");
					})
					.pipe(doubleSay)
					.pipe(exclaim).value;
			} catch (error) {
				caught = (error as Error).message === "test error";
			}

			assert.equal(caught, true);
		});
	});

	// ==========================================
	// Promise / Async Handling
	// ==========================================

	describe("async handling", () => {
		const result = "Hello!";

		it("should wrap promise factories in the middle of the chain", () =>
			ppipe(message)
				.pipe(Promise.resolve.bind(Promise) as (x: string) => Promise<string>)
				.pipe(delay(capitalize))
				.pipe(exclaim)
				.then((res) => assert.equal(result, res)));

		it("should wrap promise factories at the end of the chain", () =>
			ppipe(message)
				.pipe(capitalize)
				.pipe(delay(exclaim))
				.then((res) => assert.equal(result, res)));

		it("should wrap promises in the beginning of the chain", () =>
			ppipe(Promise.resolve(message))
				.pipe(capitalize)
				.pipe(exclaim)
				.then((res) => assert.equal(result, res)));

		it("should wrap multiple promise factories and promises in chain", () =>
			ppipe(Promise.resolve(message))
				.pipe(delay(capitalize))
				.pipe(delay(exclaim))
				.then((res) => assert.equal(result, res)));

		it("should simulate promises even when value is not delayed", () =>
			ppipe(message)
				.pipe(capitalize)
				.pipe(exclaim)
				.then((res) => assert.equal(result, res)));

		it("should be able to insert promise values as parameters", () =>
			ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe(delay(join), _, "I said")
				.pipe(join, "and suddenly", _, "without thinking")
				.pipe(delay(exclaim))
				.pipe(exclaim)
				.then((res) => assert.equal('and suddenly, "hello, hello", I said, without thinking!!', res)));

		it("should be awaitable", async () => {
			const res = await ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe((x) => ({ foo: x, bar: x.toUpperCase() }))
				.pipe((obj) => delay(join)(obj.foo, obj.foo, obj.foo, obj.bar))
				.pipe(delay(exclaim))
				.pipe(exclaim);

			assert.equal('"hello, hello", "hello, hello", "hello, hello", "HELLO, HELLO"!!', res);
		});

		it("should pass the errors when rejected", () => {
			let caught = false;

			return ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe((x) => ({ foo: x, bar: x.toUpperCase() }))
				.pipe(() => Promise.reject(new Error("oh noes")))
				.pipe(delay(exclaim))
				.pipe(exclaim)
				.catch(() => {
					caught = true;
				})
				.then(() => assert(caught, "error should have been caught"));
		});

		it("should pass the errors when thrown in async chain", () => {
			let caught = false;

			return ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe((): string => {
					throw new Error("oh noes");
				})
				.pipe(delay(exclaim))
				.pipe(exclaim)
				.catch(() => {
					caught = true;
				})
				.then(() => assert(caught, "error should have been caught"));
		});
	});

	// ==========================================
	// Extensions
	// ==========================================

	describe("extensions", () => {
		it("should support extensions", async () => {
			const newPipe = ppipe.extend({
				assertEqAndIncrement: (x: number, y: number): number => {
					assert.equal(x, y);

					return x + 1;
				},
			});
			const res = await newPipe(10)
				.pipe((x) => x + 1)
				.assertEqAndIncrement(11);

			assert.equal(res, 12);
		});

		it("should support re-extending an extended ppipe", async () => {
			const newPipe = ppipe.extend({
				assertEqAndIncrement: (x: number, y: number): number => {
					assert.equal(x, y);

					return x + 1;
				},
			});
			const newerPipe = newPipe.extend({
				divide: (x: number, y: number): number => x / y,
			});
			const res = await newerPipe(10)
				.pipe((x) => x + 1)
				.assertEqAndIncrement(11)
				.divide(12);

			assert.equal(res, 1);
		});

		it("should support typed extensions with full inference", async () => {
			const myExtensions = {
				double: (x: number): number => x * 2,
				add: (x: number, y: number): number => x + y,
				stringify: (x: number): string => String(x),
			};

			const myPipe = ppipe.extend(myExtensions);

			const numResult = myPipe(5).double().add(3).value;

			assert.equal(numResult, 13);

			const strResult = myPipe(5).double().stringify().value;

			assert.equal(strResult, "10");
		});

		it("should ignore non-function extension values", () => {
			const mixedExtensions = {
				validFn: (x: number): number => x * 2,
				notAFunction: 42,
				alsoNotAFunction: "hello",
			};
			const myPipe = ppipe.extend(mixedExtensions);
			const pipe = myPipe(5) as unknown as Record<string, unknown>;

			// Valid function extension should work
			assert.equal(typeof pipe["validFn"], "function");

			// Non-function extensions should return undefined
			assert.equal(pipe["notAFunction"], undefined);
			assert.equal(pipe["alsoNotAFunction"], undefined);
		});

		it("should ignore inherited properties on extensions", () => {
			const parent = { inheritedFn: (x: number): number => x * 3 };
			const child = Object.create(parent) as { ownFn: (x: number) => number };

			child.ownFn = (x: number): number => x * 2;

			const myPipe = ppipe.extend(child);
			const pipe = myPipe(5) as unknown as Record<string, unknown>;

			// Own property function should work
			assert.equal(typeof pipe["ownFn"], "function");

			// Inherited property should not be added as extension method
			assert.equal(pipe["inheritedFn"], undefined);
		});

		it("should preserve type through generic pass-through extensions", () => {
			// Generic identity function - should preserve pipe's type
			const pp = ppipe.extend({
				log: <T>(value: T, label?: string): T => {
					// Side effect (would normally console.log)
					void label;

					return value;
				},
			});

			// Type should be preserved through .log() - x should be number, not unknown
			const result = pp(8)
				.log()
				.pipe((x) => x + 3).value;

			assert.equal(result, 11);

			// Should work with label parameter
			const result2 = pp(8)
				.log("start")
				.pipe((x) => x * 2)
				.log("end").value;

			assert.equal(result2, 16);

			// Should work with different types
			const strResult = pp("hello")
				.log()
				.pipe((s) => s.toUpperCase()).value;

			assert.equal(strResult, "HELLO");

			// Chaining multiple logs preserves type
			const chainResult = pp(10)
				.log("a")
				.log("b")
				.log("c")
				.pipe((x) => x / 2).value;

			assert.equal(chainResult, 5);
		});
	});

	// ==========================================
	// Edge Cases for Full Coverage
	// ==========================================

	describe("edge cases", () => {
		it("should handle rejected promise at start of chain", async () => {
			let caught = false;

			await ppipe(Promise.reject(new Error("start error")))
				.pipe((x: string) => x + "!")
				.catch((err) => {
					caught = (err as Error).message === "start error";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() callback that throws", async () => {
			let caught = false;

			await ppipe("hello")
				.pipe((x) => x)
				.then(() => {
					throw new Error("then error");
				})
				.catch((err: Error) => {
					caught = err.message === "then error";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() with no callback", async () => {
			const res = await ppipe("hello")
				.pipe((x) => x)
				.then();

			assert.equal(res, "hello");
		});

		it("should handle .catch() on sync error with handler that throws", async () => {
			let caught = false;

			await ppipe("hello")
				.pipe((): string => {
					throw new Error("original");
				})
				.catch((): string => {
					throw new Error("catch error");
				})
				.catch((err: Error) => {
					caught = err.message === "catch error";
				});
			assert.equal(caught, true);
		});

		it("should handle .catch() on sync error without handler", async () => {
			let caught = false;

			try {
				await ppipe("hello")
					.pipe((): string => {
						throw new Error("no handler");
					})
					.catch();
			} catch (err) {
				caught = (err as Error).message === "no handler";
			}

			assert.equal(caught, true);
		});

		it("should handle .catch() on resolved async value", async () => {
			const res = await ppipe(Promise.resolve("async"))
				.pipe((x) => x + "!")
				.catch(() => "caught");

			assert.equal(res, "async!");
		});

		it("should handle .catch() on sync value with no error", async () => {
			const res = await ppipe("sync")
				.pipe((x) => x)
				.catch(() => "caught");

			assert.equal(res, "sync");
		});

		it("should handle .then() with onRejected for sync errors", async () => {
			const res = await ppipe("hello")
				.pipe((): string => {
					throw new Error("sync error");
				})
				.then(
					() => "fulfilled",
					() => "rejected"
				);

			assert.equal(res, "rejected");
		});

		it("should handle .then() with onRejected that throws", async () => {
			let caught = false;

			await ppipe("hello")
				.pipe((): string => {
					throw new Error("original");
				})
				.then(
					() => "fulfilled",
					(): string => {
						throw new Error("onRejected error");
					}
				)
				.catch((err: Error) => {
					caught = err.message === "onRejected error";
				});
			assert.equal(caught, true);
		});

		it("should return undefined for unknown properties", () => {
			const pipe = ppipe("hello").pipe((x) => x) as unknown as Record<string, unknown>;

			assert.equal(pipe["unknownProperty"], undefined);
		});

		it("should correctly identify placeholders with isPlaceholder", () => {
			assert.equal(isPlaceholder(_), true);
			assert.equal(isPlaceholder(exportedPlaceholder), true);
			assert.equal(isPlaceholder(null), false);
			assert.equal(isPlaceholder(undefined), false);
			assert.equal(isPlaceholder({}), false);
			assert.equal(isPlaceholder("_"), false);
		});

		it("should use directly exported placeholder", () => {
			const res = ppipe(5).pipe((a: number, b: number) => a + b, exportedPlaceholder, 3).value;

			assert.equal(res, 8);
		});

		it("should handle async rejection without catch handler in .catch()", async () => {
			let caught = false;

			try {
				await ppipe(Promise.resolve("test"))
					.pipe(() => Promise.reject(new Error("async reject")))
					.catch();
			} catch (err) {
				caught = (err as Error).message === "async reject";
			}

			assert.equal(caught, true);
		});

		it("should handle throw inside async settled chain", async () => {
			let caught = false;

			await ppipe(Promise.resolve("test"))
				.pipe((): string => {
					throw new Error("throw in settled");
				})
				.catch((err) => {
					caught = (err as Error).message === "throw in settled";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() without onFulfilled for settled async", async () => {
			const res = await ppipe(Promise.resolve("async"))
				.pipe((x) => x + "!")
				.then(null, () => "rejected");

			assert.equal(res, "async!");
		});

		it("should throw when accessing .value on rejected async pipe", async () => {
			let caught = false;

			try {
				await ppipe(Promise.resolve("test")).pipe(() => Promise.reject(new Error("value error"))).value;
			} catch (err) {
				caught = (err as Error).message === "value error";
			}

			assert.equal(caught, true);
		});

		it("should reject when .then() on sync error without onRejected", async () => {
			let caught = false;

			await ppipe("test")
				.pipe((): string => {
					throw new Error("then no handler");
				})
				.then((x) => x + "!")
				.catch((err: Error) => {
					caught = err.message === "then no handler";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() on async rejected value without onRejected", async () => {
			let caught = false;

			await ppipe(Promise.resolve("test"))
				.pipe(() => Promise.reject(new Error("async then error")))
				.then((x: string) => x + "!")
				.catch((err: Error) => {
					caught = err.message === "async then error";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() on async rejected value with onRejected", async () => {
			const res = await ppipe(Promise.resolve("test"))
				.pipe(() => Promise.reject(new Error("handled")))
				.then(
					(x: string) => x + "!",
					() => "caught by onRejected"
				);

			assert.equal(res, "caught by onRejected");
		});

		it("should handle .catch() on sync error with successful handler", async () => {
			const res = await ppipe("test")
				.pipe((): string => {
					throw new Error("caught");
				})
				.catch(() => "recovered");

			assert.equal(res, "recovered");
		});

		it("should access .val on async pipe", async () => {
			const res = await ppipe(Promise.resolve("async")).pipe((x) => x + "!").val;

			assert.equal(res, "async!");
		});

		it("should throw when accessing .val on rejected async pipe", async () => {
			let caught = false;

			try {
				await ppipe(Promise.resolve("test")).pipe(() => Promise.reject(new Error("val error"))).val;
			} catch (err) {
				caught = (err as Error).message === "val error";
			}

			assert.equal(caught, true);
		});
	});

	// ==========================================
	// Arity Checking (compile-time type safety)
	// ==========================================

	describe("arity checking", () => {
		// NOTE: These tests verify runtime behavior. The type-level arity checking
		// is tested in test-hybrid.ts (compile-time @ts-expect-error directives).
		// This section documents that arity mismatches produce 'never' type at compile time.

		it("should work correctly when function arity matches call arity", () => {
			const subtract = (a: number, b: number): number => a - b;
			const result = ppipe(10).pipe(subtract, _, 3).value;

			assert.equal(result, 7);
		});

		it("should work correctly with 3-arg functions", () => {
			const fn3 = (a: number, b: number, c: number): number => a + b + c;
			const result = ppipe(1).pipe(fn3, _, 2, 3).value;

			assert.equal(result, 6);
		});

		it("should work correctly with 4-arg functions", () => {
			const fn4 = (a: number, b: string, c: boolean, d: number): string => `${a}-${b}-${c}-${d}`;
			const result = ppipe(1).pipe(fn4, _, "x", true, 4).value;

			assert.equal(result, "1-x-true-4");
		});

		it("should work correctly with 5+ arg functions via variadic fallback", () => {
			const fn5 = (a: number, b: string, c: boolean, d: number, e: string): string => `${a}-${b}-${c}-${d}-${e}`;
			const result = ppipe(1).pipe(fn5, _, "x", true, 4, "end").value;

			assert.equal(result, "1-x-true-4-end");
		});

		it("should work with variadic functions", () => {
			const sum = (...nums: number[]): number => nums.reduce((a, b) => a + b, 0);
			const result = ppipe(1).pipe(sum, _, 2, 3, 4, 5).value;

			assert.equal(result, 15);
		});
	});

	// ==========================================
	// Alternatives for Dropped Features
	// ==========================================

	describe("alternatives for dropped features", () => {
		it("should access deep properties via lambda instead of _.a.b.c", async () => {
			const obj = { a: { b: { c: 42 } } };
			const res = ppipe(obj).pipe((x) => x.a.b.c).value;

			assert.equal(res, 42);
		});

		it("should spread arrays via lambda instead of ..._", async () => {
			const addAll = (...params: number[]): number => params.reduce((a, b) => a + b, 0);
			const res = await ppipe(1)
				.pipe((x) => [x, 2, 3])
				.pipe((arr) => addAll(...arr, 4));

			assert.equal(res, 10);
		});

		it("should access array methods via lambda instead of .map()", async () => {
			const res = await ppipe([1, 2, 3])
				.pipe((arr) => arr.map((i) => i + 1))
				.pipe((x) => x.reduce((a, b) => a + b, 0));

			assert.equal(res, 9);
		});

		it("should bind context via fn.bind() instead of .with()", () => {
			const obj = {
				multiplier: 10,
				multiply(x: number): number {
					return x * this.multiplier;
				},
			};
			const res = ppipe(5).pipe(obj.multiply.bind(obj)).value;

			assert.equal(res, 50);
		});
	});
});
