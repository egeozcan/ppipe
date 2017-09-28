let assert = require("chai").assert;
let ppipe = require("../index.js");

const add = (x, y) => x + y;
const square = x => x * x;
const divide = (x, y) => x / y;
const double = x => x * 2;

let _ = ppipe._;

const delay = fn => (...args) =>
	new Promise(resolve => setTimeout(() => resolve(fn.apply(null, args)), 10));
const someAPICall = delay(x => x);

describe("check readme", function() {
	it("first example", function() {
		const res = ppipe(1)(add, 1)(double)(square)(divide, ppipe._, 8)(add, 1)();
		assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
	});

	it("second example", function() {
		const res = ppipe(1)
			.pipe(add, 1)
			.pipe(double)
			.pipe(square)
			.pipe(divide, _, 8)
			.pipe(add, 1)();
		assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
	});

	it("third example", async function() {
		async function asyncDouble(x) {
			const result = x * 2;
			await someAPICall(result);
			return result;
		}
		const res = await ppipe(1)
			.pipe(add, 1)
			.pipe(asyncDouble)
			.pipe(square)
			.pipe(divide, _, 8)
			.pipe(add, 1);
		assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
	});

	it("fourth example", async function() {
		async function asyncComplexDouble(x) {
			const result = x * 2;
			const someInfo = await someAPICall(result);
			return { result, someInfo, getResultPlus: y => result + y };
		}
		const res = await ppipe(1)
			.pipe(add, 1)
			.pipe(asyncComplexDouble)
			.pipe(square, _.result)
			.pipe(divide, _, 8)
			.pipe(add, 1);
		assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
		const res2 = await ppipe(1)
			.pipe(add, 1)
			.pipe(asyncComplexDouble)
			.result()
			.pipe(asyncComplexDouble)
			.getResultPlus(2)
			.pipe(square)
			.pipe(divide, _, 8)
			.pipe(add, 1)
			.pipe(add, -2.5);
		assert.equal(11, res2);
	});

	it("fifth example", async function() {
		async function advancedDouble(x) {
			const result = x * 2;
			const someInfo = await someAPICall(result);
			return {
				getResult() {
					return result;
				},
				someInfo
			};
		}
		const res = await ppipe(1)
			.pipe(add, 1)
			.pipe(advancedDouble)
			.getResult()
			.pipe(square)
			.pipe(divide, _, 8)
			.pipe(add, 1);
		assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
		const res2 = await ppipe(1)
			.pipe(add, 1)
			.pipe(x => Promise.resolve(x))
			//.pipe((...params) => (console.log(params), params[0]))
			.pipe(advancedDouble)
			.getResult()
			.toFixed(2)
			.pipe(parseInt)
			.pipe(square)
			.pipe(divide, _, 8)
			.pipe(add, 1);
		assert.equal(res2, 3);
	});
});

//ppipe("hello")(doubleSay)(capitalize)(join, "ok", _, "computer")(exclaim).val
