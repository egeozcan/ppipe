/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prefer-const */
import { assert } from "chai";
import ppipe, { _ } from "../src/index";

const add = (x: number, y: number): number => x + y;
const square = (x: number): number => x * x;
const divide = (x: number, y: number): number => x / y;
const double = (x: number): number => x * 2;

const delay = <T extends (...args: any[]) => any>(fn: T) => (...args: Parameters<T>): Promise<ReturnType<T>> =>
  new Promise((resolve) => setTimeout(() => resolve(fn.apply(null, args)), 10));
const someAPICall = delay((x: any) => x);

describe("check readme", function () {
  it("first example", function () {
    const res = ppipe(1)(add, 1)(double)(square)(divide, ppipe._, 8)(add, 1)();
    assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
  });

  it("second example", function () {
    const res = ppipe(1)
      .pipe(add, 1)
      .pipe(double)
      .pipe(square)
      .pipe(divide, _, 8)
      .pipe(add, 1)();
    assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
  });

  it("third example", async function () {
    async function asyncDouble(x: number) {
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

  it("fourth example", async function () {
    async function asyncComplexDouble(x: number) {
      const result = x * 2;
      const someInfo = await someAPICall(result);
      return {
        result,
        someInfo,
        getResultPlus: (y: number) => result + y,
      };
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
    assert.equal(res, add(divide(square(double(add(1, 1))), 8), 1));
  });

  it("fourth example async result", async function () {
    async function asyncComplexDouble(x: number) {
      const result = x * 2;
      const someInfo = await someAPICall(result);
      //go wild with deferring
      return Promise.resolve({
        result,
        someInfo,
        //go wilder with deferring
        getResultPlusAsync: (y: number) =>
          new Promise((resolve) => setTimeout(() => resolve(result + y), 10)),
      });
    }
    const res3 = await ppipe(1)
      .pipe(add, 1)
      .pipe(asyncComplexDouble)
      .result()
      .pipe(asyncComplexDouble)
      .getResultPlusAsync(2)
      .pipe(square)
      .pipe(divide, _, 8)
      .pipe(add, 1)
      .pipe(add, -2.5);
    assert.equal(11, res3);
  });

  it("fifth example", async function () {
    async function advancedDouble(x: number) {
      const result = x * 2;
      const someInfo = await someAPICall(result);
      return {
        getResult() {
          return result;
        },
        someInfo,
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
      .pipe((x: any) => Promise.resolve(x))
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

  it("sixth example", async function () {
    class Example {
        foo: Promise<number>
      constructor(myInt: number) {
        this.foo = Promise.resolve(myInt);
      }
      addToFoo(x: number) {
        return this.foo.then((foo) => foo + x);
      }
    }
    const res = await ppipe(10)
      .with(new Example(5))
      .addToFoo(_);
    assert.equal(res, 15);
    const res2 = await ppipe(10)
      .with(new Example(5))
      .addToFoo();
    assert.equal(res2, 15);
  });

  it("seventh example", async function () {
    let logged = false;
    const newPipe = ppipe.extend({
      divide(x: number, y: number) {
        return x / y;
      },
      log(...params: any[]) {
        logged = true;
        assert.equal(params[params.length - 1], 1);
        return params[params.length - 1];
      },
    });
    const res = await newPipe(10)
      .pipe((x: number) => x + 1)
      .divide(_, 11)
      .log("here is our x: ")
      .pipe((x: number) => x + 1);
    assert.equal(res, 2);
    assert.equal(logged, true);
  });
});
