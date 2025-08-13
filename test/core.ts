import { assert } from "chai";
import ppipe, { _ } from "../src/index";

describe("Core ppipe functionality", () => {
  const add = (a: number, b: number) => a + b;
  const square = (n: number) => n * n;
  const double = (n: number) => n * 2;

  it("should pipe a value through a series of functions", () => {
    const result = (ppipe(2) as any).pipe(add, 3).pipe(square).pipe(double)();
    assert.equal(result, 50);
  });

  it("should return the value when no function is passed", () => {
    const result = ppipe(10)();
    assert.equal(result, 10);
  });

  it("should handle placeholders correctly", () => {
    const result = (ppipe(5) as any).pipe(add, _, 3)();
    assert.equal(result, 8);
  });

  it("should handle property access with placeholders", () => {
    const obj = { a: { b: 5 } };
    const result = (ppipe(obj) as any).pipe( (val: any) => val, _.a.b )();
    assert.equal(result, 5);
  });

  it("should handle async functions in the chain", async () => {
    const asyncAdd = async (a: number, b: number) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return a + b;
    };
    const result = await (ppipe(2) as any).pipe(asyncAdd, 3)();
    assert.equal(result, 5);
  });

  it("should handle promises in the chain", async () => {
    const result = await (ppipe(Promise.resolve(5)) as any).pipe(add, 3)();
    assert.equal(result, 8);
  });

  it("should handle errors in the chain", async () => {
    const errorMessage = "Something went wrong";
    try {
      await (ppipe(2) as any).pipe((): never => {
        throw new Error(errorMessage);
      })();
    } catch (error: any) {
      assert.equal(error.message, errorMessage);
    }
  });

  context("with()", () => {
    class Test {
      value: number;
      constructor(initial: number) {
        this.value = initial;
      }
      increment() {
        this.value = this.value + 1;
        return this;
      }
      add(x: Test) {
        this.value = this.value + x.value;
        return this;
      }
    }

    it("should switch the context", () => {
      const startVal = new Test(5);
      const result = (ppipe(startVal) as any)
        .increment()
        .with(new Test(10))
        .add(startVal)
        .val.value;
      assert.equal(result, 16);
    });
  });

  context("extensions", () => {
    const newPipe = ppipe.extend({
      double: (x: number) => x * 2,
    });

    it("should allow extending the pipe with new functions", () => {
      const result = (newPipe(5) as any).double().val;
      assert.equal(result, 10);
    });
  });
});
