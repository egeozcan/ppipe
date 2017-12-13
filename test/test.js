/* eslint quotes: "off" */

let assert = require("chai").assert;
let ppipe = require("../src/index.js");

function doubleSay(str) {
	return str + ", " + str;
}
function capitalize(str) {
	return str[0].toUpperCase() + str.substring(1);
}
function delay(fn) {
	return function() {
		let args = arguments;
		return new Promise(resolve =>
			setTimeout(() => resolve(fn.apply(null, args)), 10)
		);
	};
}
function exclaim(str) {
	return str + "!";
}
function join() {
	let arr = Array.from(arguments);
	return arr.join(", ");
}
function quote(str) {
	return '"' + str + '"';
}

let _ = ppipe._;

describe("ppipe", function() {
	let message = "hello";
	it("should correctly pass the params to the first fn", function() {
		assert.equal(ppipe(message)(doubleSay).val, doubleSay(message));
	});

	it("should throw if accessing val from a pipe that contains an error", function() {
		let caught = false;
		try {
			ppipe(message)(() => {
				throw new Error("foo");
			})(doubleSay).val;
		} catch (error) {
			caught = error.message === "foo";
		}
		assert.equal(caught, true);
	});

	it("should throw if ending a pipe that contains an error", function() {
		let caught = false;
		try {
			ppipe(message)(() => {
				throw new Error("foo");
			})(doubleSay)();
		} catch (error) {
			caught = error.message === "foo";
		}
		assert.equal(caught, true);
	});

	it("should fail promise if ending an async pipe that contains an error even when the deferred value comes later", async function() {
		let caught = false;
		try {
			await ppipe(message)(() => {
				throw new Error("foo");
			})(() => Promise.resolve(message))(doubleSay).then(x => x);
		} catch (error) {
			caught = error.message === "foo";
		}
		assert.equal(caught, true);
	});

	it("should not touch the error as long as it exists when an undefined prop is called", async function() {
		let caught = false;
		try {
			var error = new Error("oh noes");
			await ppipe()(() => Promise.reject(error)).weCantKnowIfThisMethodExists();
		} catch (error) {
			caught = error.message === "oh noes";
		}
		assert.equal(caught, true);
	});

	it("should not continue a sync chain if a method is missing", function() {
		let caught = false;
		try {
			ppipe("foo")(x => x).weKnowThisMethodIsMissing();
		} catch (error) {
			caught = true;
		}
		assert.equal(caught, true);
	});

	it("should error with missing method if no errors exist in ctx and missing method is called", async function() {
		let caught = false;
		try {
			await ppipe("foo")(x => Promise.resolve(x)).weKnowThisMethodIsMissing();
		} catch (error) {
			caught = true;
		}
		assert.equal(caught, true);
	});

	it("should throw if a non-function is passed as the first argument", function() {
		let caught = false;
		try {
			ppipe(message)({})(doubleSay)();
		} catch (error) {
			const expectedErrorMessage =
				"first parameter to a pipe should be a function or a single placeholder";
			caught = error.message === expectedErrorMessage;
		}
		assert.equal(caught, true);
	});

	it("should correctly pass the params to the second fn", function() {
		assert.equal(
			ppipe(message)(doubleSay)(exclaim).val,
			exclaim(doubleSay(message))
		);
	});

	it("should correctly insert parameters", function() {
		assert.equal(
			ppipe(message)(doubleSay)(join, _, "I said")(exclaim).val,
			exclaim(join(doubleSay(message), "I said"))
		);
	});

	it("should insert parameters at the end when no placeholder exists", function() {
		assert.equal(
			ppipe(message)(doubleSay)(join, "I said")(exclaim).val,
			exclaim(join("I said", doubleSay(message)))
		);
	});

	it("should correctly insert parameters on multiple functions", function() {
		assert.equal(
			ppipe(message)(doubleSay)(join, _, "I said")(exclaim)(
				join,
				"and suddenly",
				_,
				"without thinking"
			).val,
			join(
				"and suddenly",
				exclaim(join(doubleSay(message), "I said")),
				"without thinking"
			)
		);
	});

	it("should return the value when no function is passed", function() {
		assert.equal(
			ppipe(message)(doubleSay)(join, _, "I said")(exclaim)(
				join,
				"and suddenly",
				_,
				"without thinking"
			)(),
			join(
				"and suddenly",
				exclaim(join(doubleSay(message), "I said")),
				"without thinking"
			)
		);
	});

	let result = "Hello!";

	it("should wrap promise factories in the middle of the chain", function() {
		return ppipe(message)(Promise.resolve.bind(Promise))(delay(capitalize))(
			exclaim
		).then(res => {
			return assert.equal(result, res);
		});
	});

	it("should wrap promise factories at the end of the chain", function() {
		return ppipe(message)(capitalize)(delay(exclaim)).then(res => {
			return assert.equal(result, res);
		});
	});

	it("should wrap promises in the beginning of the chain", function() {
		return ppipe(Promise.resolve(message))(capitalize)(exclaim).then(res => {
			return assert.equal(result, res);
		});
	});

	it("should wrap multiple promise factories and promises in chain", function() {
		return ppipe(Promise.resolve(message))(delay(capitalize))(
			delay(exclaim)
		).then(res => {
			return assert.equal(result, res);
		});
	});

	it("should simulate promises even when value is not delayed", function() {
		return ppipe(message)(capitalize)(exclaim).then(res => {
			return assert.equal(result, res);
		});
	});

	it("should be able to insert promise values as parameters", function() {
		return ppipe(message)(doubleSay)(delay(quote))(delay(join), _, "I said")(
			join,
			"and suddenly",
			_,
			"without thinking"
		)(delay(exclaim))(exclaim).then(res =>
			assert.equal(
				'and suddenly, "hello, hello", I said, without thinking!!',
				res
			)
		);
	});

	it("should be able to insert promise values more than once", function() {
		return ppipe(message)(doubleSay)(delay(quote))(
			delay(join),
			_,
			"test",
			_,
			_,
			_,
			"test"
		)(delay(exclaim))(exclaim).then(res =>
			assert.equal(
				'"hello, hello", test, "hello, hello", "hello, hello", "hello, hello", test!!',
				res
			)
		);
	});

	it("should be able to insert selected properties from promise values more than once", function() {
		return ppipe(message)
			.pipe(doubleSay)
			.pipe(delay(quote))
			.pipe(x => ({ foo: x, bar: x.toUpperCase() }))
			.pipe(delay(join), _.foo, _.foo, _.foo, _.bar)
			.pipe(delay(exclaim))
			.pipe(exclaim)
			.then(res =>
				assert.equal(
					'"hello, hello", "hello, hello", "hello, hello", "HELLO, HELLO"!!',
					res
				)
			);
	});

	it("should be awaitable", async function() {
		const res = await ppipe(message)
			.pipe(doubleSay)
			.pipe(delay(quote))
			.pipe(x => ({ foo: x, bar: x.toUpperCase() }))
			.pipe(delay(join), _.foo, _.foo, _.foo, _.bar)
			.pipe(delay(exclaim))
			.pipe(exclaim);
		assert.equal(
			'"hello, hello", "hello, hello", "hello, hello", "HELLO, HELLO"!!',
			res
		);
	});

	it("should pass the errors when rejected", function() {
		let caught = false;
		return ppipe(message)
			.pipe(doubleSay)
			.pipe(delay(quote))
			.pipe(x => ({ foo: x, bar: x.toUpperCase() }))
			.pipe(delay(join), _.foo, _.foo, _.foo, _.bar)
			.pipe(() => Promise.reject(new Error("oh noes")))
			.pipe(delay(exclaim))
			.pipe(exclaim)
			.catch(() => {
				caught = true;
			})
			.then(() => assert(caught, true));
	});

	it("should pass the errors when thrown", function() {
		let caught = false;
		return ppipe(message)
			.pipe(doubleSay)
			.pipe(delay(quote))
			.pipe(x => ({ foo: x, bar: x.toUpperCase() }))
			.pipe(delay(join), _.foo, _.foo, _.foo, _.bar)
			.pipe(() => {
				throw new Error("oh noes");
			})
			.someMethodOfThePotentialResultIWantedToCallIfThereWasntAnError()
			.pipe(delay(exclaim))
			.pipe(exclaim)
			.catch(() => {
				caught = true;
			})
			.then(() => assert(caught, true));
	});

	it("should have catchable async errors", function() {
		let caught = false;
		try {
			ppipe(message)
				.pipe(doubleSay)
				.pipe(() => {
					throw new Error("oh noes");
				})
				.someMethodOfThePotentialResultIWantedToCallIfThereWasntAnError()
				.pipe(delay(exclaim));
		} catch (error) {
			caught = true;
		}
		assert(caught, true);
	});

	it("should be able to access result prototype methods", function() {
		return ppipe([1, 2, 3])
			.map(i => i + 1)
			.pipe(x => x.reduce((x, y) => x + y, 0))
			.then(res => {
				return assert.equal(9, res);
			});
	});

	it("should be able to revert to chaining and back from prototype methods", function() {
		const divide = (x, y) => x / y;
		return (
			ppipe("dummy")(() => [1, 2, 3])
				.map(i => i + 1)
				/*reduce: 9, divide: 9/3 == 3*/
				.reduce((x, y) => x + y, 0)
				.pipe(divide, _, 3)
				.then(x => assert.equal(3, x))
		);
	});

	it("should be able to access properties of the result", function() {
		const divide = (x, y) => x / y;
		return ppipe("dummy")(() => [1, 2, 3])
			.map(i => i + 1)
			.length()
			.pipe(divide, _, 3)
			.then(x => assert.equal(1, x));
	});

	it("should return itself via .pipe", function() {
		const divide = (x, y) => x / y;
		return (
			ppipe("dummy")(() => [1, 2, 3])
				.map(i => i + 1)
				/*reduce: 9, divide: 9/3 == 3*/
				.reduce((x, y) => x + y, 0)
				.pipe(divide, _, 3)
				.then(x => assert.equal(3, x))
		);
	});

	class Test {
		constructor(initial) {
			this.value = initial;
		}
		increment() {
			this.value = this.value + 1;
			return this;
		}
		square() {
			this.value = this.value * this.value;
			return this;
		}
		add(x) {
			this.value = this.value + x.value;
			return this;
		}
		doWeirdStuff(x, y) {
			return this.value * 100 + x * 10 + y;
		}
	}

	it("should be able to switch context by using 'with'", () => {
		const startVal = new Test(5);
		ppipe(startVal)
			.square()
			.increment()
			.with(new Test(9))
			.add()
			.with(new Test(1))
			.doWeirdStuff(_.value, _.value)
			.with(assert)
			.equal(_, 485);
		const secondStartVal = new Test(5);
		const res = ppipe(secondStartVal)
			.square()
			.increment()
			.with(new Test(9))
			.add()
			.with(new Test(1))
			.doWeirdStuff(_.value, _.value);
		assert.equal(res.val, 485);
	});

	it("should keep the context gained with 'with' after a 'pipe'", () => {
		const startVal = new Test(5);
		const res = ppipe(startVal)
			.square()
			.increment()
			.with(new Test(9))
			.add()
			.with(new Test(1))
			.pipe(Test.prototype.doWeirdStuff, _.value, _.value).val;
		assert.equal(res, 485);

		const secondStartVal = new Test(5);
		const res2 = ppipe(secondStartVal)
			.square()
			.increment()
			.with(new Test(9))
			.add()
			.with(new Test(1))
			.pipe(secondStartVal.doWeirdStuff, _.value, _.value).val;
		assert.equal(res2, 485);
	});

	it("should not mess with the promises", async () => {
		const startVal = new Test(5);
		const res = await ppipe(startVal)
			.square()
			.increment()
			.with(new Test(9))
			.then(x => 10 * x.value)
			.catch(() => {
				throw new Error("should not be reachable");
			});
		const res2 = await ppipe(res).pipe((x, y) => x + y, 1);
		assert.equal(res2, 261);
	});

	it("should support binding, applying and calling", async () => {
		const res = await ppipe(10)
			.call(null, x => x + 1)
			.apply(null, [x => Promise.resolve(x)])
			.bind(null, (x, y) => x / y)(_, 10);
		assert.equal(res, 1.1);
	});

	it("should support extensions", async () => {
		const newPipe = ppipe.extend({
			assertEqAndIncrement: (x, y) => {
				assert.equal(x, y);
				return x + 1;
			}
		});
		const res = await newPipe(10)
			.pipe(x => x + 1)
			.assertEqAndIncrement(_, 11);
		assert.equal(res, 12);
	});

	it("should support re-extending an extended ppipe", async () => {
		const newPipe = ppipe.extend({
			assertEqAndIncrement: (x, y) => {
				assert.equal(x, y);
				return x + 1;
			}
		});
		const newerPipe = newPipe.extend({
			divide: (x, y) => {
				return x / y;
			}
		});
		const res = await newerPipe(10)
			.pipe(x => x + 1)
			.assertEqAndIncrement(_, 11)
			.divide(_, 12);
		assert.equal(res, 1);
	});

	it("should support expanding the array result", async () => {
		const addAll = (...params) => {
			return params.reduce((a, b) => a + b, 0);
		};
		const res = await ppipe(1)
			.pipe(x => [x, 2, 3])
			.pipe(addAll, ..._, 4);
		assert.equal(res, 10);
	});

	it("should support expanding the array property of result", async () => {
		const addAll = (...params) => {
			return params.reduce((a, b) => a + b, 0);
		};
		const res = await ppipe(1)
			.pipe(x => ({ test: [x, 2, 3] }))
			.pipe(addAll, ..._.test, 4);
		assert.equal(res, 10);
	});

	it("should support expanding the deep array property of result", async () => {
		const addAll = (...params) => {
			return params.reduce((a, b) => a + b, 0);
		};
		const res = await ppipe(1)
			.pipe(x => ({ test: { test: [x, 2, 3] } }))
			.pipe(addAll, ..._.test.test, 4);
		assert.equal(res, 10);
	});

	it("should return undefined when getting not existing deep properties", async () => {
		const res = await ppipe(1)
			.pipe(x => ({ test: { test: [x, 2, 3] } }))
			.pipe(x => x, _.test.test.foo.bar);
		assert.equal(res, undefined);
	});

	it("should use unit fn with no defined and a single param", async () => {
		const res = await ppipe(1)
			.pipe(x => ({ test: { test: [x, 2, 3] } }))
			.pipe(_.test.test.foo.bar);
		assert.equal(res, undefined);
		const res2 = await ppipe(1)
			.pipe(x => ({ test: { test: [x, 2, 3] } }))
			.pipe(_.test.test[0]);
		assert.equal(res2, 1);
	});

	it("should be able to extract array members", async () => {
		async function asyncComplexDoubleArray(x) {
			const result = x * 2;
			const input = x;
			return [await Promise.resolve(0), result, input, 20]; //some API designed by a mad scientist
		}
		const addAll = (...params) => {
			return params.reduce((a, b) => a + b, 0);
		};
		const res = await ppipe(5)
			.pipe(asyncComplexDoubleArray)
			.pipe(addAll, _[1], _[2]);
		assert.equal(res, 15);
		const res2 = await ppipe(5)
			.pipe(asyncComplexDoubleArray)
			.pipe(addAll, _["[1]"], _["[2]"]);
		assert.equal(res2, 15);
		const res3 = await ppipe(5)
			.pipe(asyncComplexDoubleArray)
			.pipe(x => ({ test: x, foo: "bar" }))
			.pipe(addAll, _["test[1]"], _.test[2], _.test["3"]);
		assert.equal(res3, 35);
		const res4 = await ppipe(5)
			.pipe(asyncComplexDoubleArray)
			.pipe(x => ({ test: () => ({ innerTest: x }), foo: "bar" }))
			.pipe(
				addAll,
				_["test().innerTest[1]"],
				_["test().innerTest"][2],
				..._["test()"].innerTest
			);
		assert.equal(res4, 50);
		const res5 = await ppipe(5)
			.pipe(asyncComplexDoubleArray)
			.pipe(x => ({ test: () => ({ innerTest: x }), foo: "bar" }))
			.test()
			.innerTest()
			.pipe(addAll, _[1], _[2]);
		assert.equal(res5, 15);
	});
	it("should be able to extract promised values", async () => {
		const getXAsync = x =>
			new Promise(res => setTimeout(() => res({ result: x }), 1));
		const aComplexResult = { a: { complex: getXAsync.bind(null, 2) } };
		const res = await ppipe(aComplexResult)
			.pipe(_.a["complex()"].result)
			.pipe(x => x * x);
		assert.equal(res, 4);
		const res2 = await ppipe(aComplexResult)
			.pipe(_.a["complex().result"])
			.pipe(x => x * x);
		assert.equal(res2, 4);
		const res3 = await ppipe(aComplexResult)
			.a()
			.complex()
			.result()
			.pipe(x => x * x);
		assert.equal(res3, 4);
		const plainCrazyResult = {
			a: { complex: getXAsync.bind(null, aComplexResult) }
		};
		const res4 = await ppipe(plainCrazyResult)
			.a()
			.complex()
			.result()
			.a()
			.complex()
			.result()
			.pipe(x => x * x);
		assert.equal(res4, 4);
		const res5 = await ppipe(plainCrazyResult)
			.pipe(_.a["complex()"].result.a["complex()"].result)
			.pipe(x => x * x);
		assert.equal(res5, 4);
	});
});
