import { assert } from "chai";
import ppipe, { isPlaceholder, _ as exportedPlaceholder } from "../src/index";

function doubleSay(str: string): string {
	return str + ", " + str;
}

function capitalize(str: string): string {
	return str[0]!.toUpperCase() + str.substring(1);
}

function delay<T extends (...args: never[]) => unknown>(
	fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return function (...args: Parameters<T>): Promise<ReturnType<T>> {
		return new Promise((resolve) =>
			setTimeout(() => resolve(fn(...args) as ReturnType<T>), 10)
		);
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

describe("ppipe (TypeScript rewrite)", function () {
	const message = "hello";

	// ==========================================
	// Basic Piping
	// ==========================================

	describe("basic piping", function () {
		it("should correctly pass the params to the first fn", function () {
			assert.equal(ppipe(message).pipe(doubleSay).value, doubleSay(message));
		});

		it("should correctly pass the params to the second fn", function () {
			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(exclaim).value,
				exclaim(doubleSay(message))
			);
		});

		it("should support using .val as alias for .value", function () {
			assert.equal(ppipe(message).pipe(doubleSay).val, doubleSay(message));
		});
	});

	// ==========================================
	// Placeholder Positioning
	// ==========================================

	describe("placeholder positioning", function () {
		it("should correctly insert parameters with placeholder at first position", function () {
			const join2 = (a: string, b: string): string => [a, b].join(", ");
			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join2, _, "I said").pipe(exclaim)
					.value,
				exclaim(join2(doubleSay(message), "I said"))
			);
		});

		it("should append value at end when no placeholder exists", function () {
			const join2 = (a: string, b: string): string => [a, b].join(", ");
			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join2, "I said").pipe(exclaim).value,
				exclaim(join2("I said", doubleSay(message)))
			);
		});

		it("should correctly insert parameters on multiple functions", function () {
			const join2 = (a: string, b: string): string => [a, b].join(", ");
			const join3 = (a: string, b: string, c: string): string => [a, b, c].join(", ");
			assert.equal(
				ppipe(message)
					.pipe(doubleSay)
					.pipe(join2, _, "I said")
					.pipe(exclaim)
					.pipe(join3, "and suddenly", _, "without thinking").value,
				join3(
					"and suddenly",
					exclaim(join2(doubleSay(message), "I said")),
					"without thinking"
				)
			);
		});

		it("should be able to insert value more than once with multiple placeholders", function () {
			const addBoth = (a: number, b: number): number => a + b;
			assert.equal(ppipe(5).pipe(addBoth, _, _).value, 10);
		});
	});

	// ==========================================
	// Error Handling
	// ==========================================

	describe("error handling", function () {
		it("should throw if accessing value from a pipe that contains an error", function () {
			let caught = false;
			try {
				ppipe(message)
					.pipe(() => {
						throw new Error("foo");
					})
					.pipe(doubleSay).value;
			} catch (error) {
				caught = (error as Error).message === "foo";
			}
			assert.equal(caught, true);
		});

		it("should propagate errors through the chain", function () {
			let caught = false;
			try {
				ppipe(message)
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

	describe("async handling", function () {
		const result = "Hello!";

		it("should wrap promise factories in the middle of the chain", function () {
			return ppipe(message)
				.pipe(Promise.resolve.bind(Promise) as (x: string) => Promise<string>)
				.pipe(delay(capitalize))
				.pipe(exclaim)
				.then((res) => {
					return assert.equal(result, res);
				});
		});

		it("should wrap promise factories at the end of the chain", function () {
			return ppipe(message)
				.pipe(capitalize)
				.pipe(delay(exclaim))
				.then((res) => {
					return assert.equal(result, res);
				});
		});

		it("should wrap promises in the beginning of the chain", function () {
			return ppipe(Promise.resolve(message))
				.pipe(capitalize)
				.pipe(exclaim)
				.then((res) => {
					return assert.equal(result, res);
				});
		});

		it("should wrap multiple promise factories and promises in chain", function () {
			return ppipe(Promise.resolve(message))
				.pipe(delay(capitalize))
				.pipe(delay(exclaim))
				.then((res) => {
					return assert.equal(result, res);
				});
		});

		it("should simulate promises even when value is not delayed", function () {
			return ppipe(message)
				.pipe(capitalize)
				.pipe(exclaim)
				.then((res) => {
					return assert.equal(result, res);
				});
		});

		it("should be able to insert promise values as parameters", function () {
			return ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe(delay(join), _, "I said")
				.pipe(join, "and suddenly", _, "without thinking")
				.pipe(delay(exclaim))
				.pipe(exclaim)
				.then((res) =>
					assert.equal(
						'and suddenly, "hello, hello", I said, without thinking!!',
						res
					)
				);
		});

		it("should be awaitable", async function () {
			const res = await ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe((x) => ({ foo: x, bar: x.toUpperCase() }))
				.pipe((obj) => delay(join)(obj.foo, obj.foo, obj.foo, obj.bar))
				.pipe(delay(exclaim))
				.pipe(exclaim);
			assert.equal(
				'"hello, hello", "hello, hello", "hello, hello", "HELLO, HELLO"!!',
				res
			);
		});

		it("should pass the errors when rejected", function () {
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

		it("should pass the errors when thrown in async chain", function () {
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

	describe("extensions", function () {
		it("should support extensions", async function () {
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

		it("should support re-extending an extended ppipe", async function () {
			const newPipe = ppipe.extend({
				assertEqAndIncrement: (x: number, y: number): number => {
					assert.equal(x, y);
					return x + 1;
				},
			});
			const newerPipe = newPipe.extend({
				divide: (x: number, y: number): number => {
					return x / y;
				},
			});
			const res = await newerPipe(10)
				.pipe((x) => x + 1)
				.assertEqAndIncrement(11)
				.divide(12);
			assert.equal(res, 1);
		});

		it("should support typed extensions with full inference", async function () {
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

		it("should ignore non-function extension values", function () {
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

		it("should ignore inherited properties on extensions", function () {
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
	});

	// ==========================================
	// Edge Cases for Full Coverage
	// ==========================================

	describe("edge cases", function () {
		it("should handle rejected promise at start of chain", async function () {
			let caught = false;
			await ppipe(Promise.reject(new Error("start error")))
				.pipe((x: string) => x + "!")
				.catch((err) => {
					caught = (err as Error).message === "start error";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() callback that throws", async function () {
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

		it("should handle .then() with no callback", async function () {
			const res = await ppipe("hello").pipe((x) => x).then();
			assert.equal(res, "hello");
		});

		it("should handle .catch() on sync error with handler that throws", async function () {
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

		it("should handle .catch() on sync error without handler", async function () {
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

		it("should handle .catch() on resolved async value", async function () {
			const res = await ppipe(Promise.resolve("async"))
				.pipe((x) => x + "!")
				.catch(() => "caught");
			assert.equal(res, "async!");
		});

		it("should handle .catch() on sync value with no error", async function () {
			const res = await ppipe("sync").pipe((x) => x).catch(() => "caught");
			assert.equal(res, "sync");
		});

		it("should handle .then() with onRejected for sync errors", async function () {
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

		it("should handle .then() with onRejected that throws", async function () {
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

		it("should return undefined for unknown properties", function () {
			const pipe = ppipe("hello").pipe((x) => x) as unknown as Record<
				string,
				unknown
			>;
			assert.equal(pipe["unknownProperty"], undefined);
		});

		it("should correctly identify placeholders with isPlaceholder", function () {
			assert.equal(isPlaceholder(_), true);
			assert.equal(isPlaceholder(exportedPlaceholder), true);
			assert.equal(isPlaceholder(null), false);
			assert.equal(isPlaceholder(undefined), false);
			assert.equal(isPlaceholder({}), false);
			assert.equal(isPlaceholder("_"), false);
		});

		it("should use directly exported placeholder", function () {
			const res = ppipe(5).pipe((a: number, b: number) => a + b, exportedPlaceholder, 3).value;
			assert.equal(res, 8);
		});

		it("should handle async rejection without catch handler in .catch()", async function () {
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

		it("should handle throw inside async settled chain", async function () {
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

		it("should handle .then() without onFulfilled for settled async", async function () {
			const res = await ppipe(Promise.resolve("async"))
				.pipe((x) => x + "!")
				.then(null, () => "rejected");
			assert.equal(res, "async!");
		});

		it("should throw when accessing .value on rejected async pipe", async function () {
			let caught = false;
			try {
				await ppipe(Promise.resolve("test"))
					.pipe(() => Promise.reject(new Error("value error")))
					.value;
			} catch (err) {
				caught = (err as Error).message === "value error";
			}
			assert.equal(caught, true);
		});

		it("should reject when .then() on sync error without onRejected", async function () {
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

		it("should handle .then() on async rejected value without onRejected", async function () {
			let caught = false;
			await ppipe(Promise.resolve("test"))
				.pipe(() => Promise.reject(new Error("async then error")))
				.then((x: string) => x + "!")
				.catch((err: Error) => {
					caught = err.message === "async then error";
				});
			assert.equal(caught, true);
		});

		it("should handle .then() on async rejected value with onRejected", async function () {
			const res = await ppipe(Promise.resolve("test"))
				.pipe(() => Promise.reject(new Error("handled")))
				.then(
					(x: string) => x + "!",
					() => "caught by onRejected"
				);
			assert.equal(res, "caught by onRejected");
		});

		it("should handle .catch() on sync error with successful handler", async function () {
			const res = await ppipe("test")
				.pipe((): string => {
					throw new Error("caught");
				})
				.catch(() => "recovered");
			assert.equal(res, "recovered");
		});

		it("should access .val on async pipe", async function () {
			const res = await ppipe(Promise.resolve("async")).pipe((x) => x + "!").val;
			assert.equal(res, "async!");
		});

		it("should throw when accessing .val on rejected async pipe", async function () {
			let caught = false;
			try {
				await ppipe(Promise.resolve("test"))
					.pipe(() => Promise.reject(new Error("val error")))
					.val;
			} catch (err) {
				caught = (err as Error).message === "val error";
			}
			assert.equal(caught, true);
		});
	});

	// ==========================================
	// Alternatives for Dropped Features
	// ==========================================

	describe("alternatives for dropped features", function () {
		it("should access deep properties via lambda instead of _.a.b.c", async function () {
			const obj = { a: { b: { c: 42 } } };
			const res = ppipe(obj)
				.pipe((x) => x.a.b.c)
				.value;
			assert.equal(res, 42);
		});

		it("should spread arrays via lambda instead of ..._", async function () {
			const addAll = (...params: number[]): number => {
				return params.reduce((a, b) => a + b, 0);
			};
			const res = await ppipe(1)
				.pipe((x) => [x, 2, 3])
				.pipe((arr) => addAll(...arr, 4));
			assert.equal(res, 10);
		});

		it("should access array methods via lambda instead of .map()", async function () {
			const res = await ppipe([1, 2, 3])
				.pipe((arr) => arr.map((i) => i + 1))
				.pipe((x) => x.reduce((a, b) => a + b, 0));
			assert.equal(res, 9);
		});

		it("should bind context via fn.bind() instead of .with()", function () {
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
