/* eslint quotes: "off" */

const assert = require("chai").assert;
const ppipe = require("../dist/index.js").default;

function doubleSay(str) {
	return str + ", " + str;
}
function capitalize(str) {
	return str[0].toUpperCase() + str.substring(1);
}
function delay(fn) {
	return function () {
		const args = arguments;
		return new Promise((resolve) =>
			setTimeout(() => resolve(fn.apply(null, args)), 10)
		);
	};
}
function exclaim(str) {
	return str + "!";
}
function join() {
	const arr = Array.from(arguments);
	return arr.join(", ");
}
function quote(str) {
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
			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join, _, "I said").pipe(exclaim)
					.value,
				exclaim(join(doubleSay(message), "I said"))
			);
		});

		it("should append value at end when no placeholder exists", function () {
			assert.equal(
				ppipe(message).pipe(doubleSay).pipe(join, "I said").pipe(exclaim)
					.value,
				exclaim(join("I said", doubleSay(message)))
			);
		});

		it("should correctly insert parameters on multiple functions", function () {
			assert.equal(
				ppipe(message)
					.pipe(doubleSay)
					.pipe(join, _, "I said")
					.pipe(exclaim)
					.pipe(join, "and suddenly", _, "without thinking").value,
				join(
					"and suddenly",
					exclaim(join(doubleSay(message), "I said")),
					"without thinking"
				)
			);
		});

		it("should be able to insert value more than once with multiple placeholders", function () {
			const addBoth = (a, b) => a + b;
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
				caught = error.message === "foo";
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
				caught = error.message === "test error";
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
				.pipe(Promise.resolve.bind(Promise))
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
				.then(() => assert(caught, true));
		});

		it("should pass the errors when thrown in async chain", function () {
			let caught = false;
			return ppipe(message)
				.pipe(doubleSay)
				.pipe(delay(quote))
				.pipe(() => {
					throw new Error("oh noes");
				})
				.pipe(delay(exclaim))
				.pipe(exclaim)
				.catch(() => {
					caught = true;
				})
				.then(() => assert(caught, true));
		});
	});

	// ==========================================
	// Extensions
	// ==========================================

	describe("extensions", function () {
		it("should support extensions", async function () {
			const newPipe = ppipe.extend({
				assertEqAndIncrement: (x, y) => {
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
				assertEqAndIncrement: (x, y) => {
					assert.equal(x, y);
					return x + 1;
				},
			});
			const newerPipe = newPipe.extend({
				divide: (x, y) => {
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
				double: (x) => x * 2,
				add: (x, y) => x + y,
				stringify: (x) => String(x),
			};

			const myPipe = ppipe.extend(myExtensions);

			const numResult = myPipe(5).double().add(3).value;
			assert.equal(numResult, 13);

			const strResult = myPipe(5).double().stringify().value;
			assert.equal(strResult, "10");
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
			const addAll = (...params) => {
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
				multiply(x) {
					return x * this.multiplier;
				},
			};
			const res = ppipe(5).pipe(obj.multiply.bind(obj)).value;
			assert.equal(res, 50);
		});
	});
});
