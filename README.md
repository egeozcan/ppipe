# ppipe
pipes values through functions, an alternative to using the [proposed pipe operator](https://github.com/mindeavor/es-pipeline-operator) ( |> ) for ES.

Supports functions returning promises too. In that case, the result of the
chain will also be a promise. This is similar to the proposed support for
await in the chained functions.

## Installation

`npm install ppipe`

## Problems ppipe solves

Let's assume you have these functions:

```javascript
const add = (x, y) => x + y;
const square = x => x * x;
const divide = (x, y) => x / y;
const double = x => x + x;
```

How do you pass the results from one to another?

```javascript
  //good old single line solution
  add(divide(square(double(add(1, 1))), 8), 1);
  //try to get creative with variable names?
  const incremented = add(1, 1);
  const doubled = double(incremented);
  //...
```

An ideal solution would have been having a pipe operator (|>) but we don't have it. Here is
where ppipe comes in.

```javascript
ppipe(1)
  (add, 1)
  (double)
  (square)
  //order of arguments can be manipulated using the _ property of ppipe function
  //the result of the previous function is inserted to its place if it exists in the arguments
  //it can also occur more than once if you want to pass the same parameter more than once
  (divide, ppipe._, 8)
  (add, 1)(); // 3
```

If that is too lisp-y, you can also use ".pipe".

```javascript
const _ = ppipe._; //to reduce eyesore
ppipe(1)
  .pipe(add, 1)
  .pipe(double)
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1)(); // 3
```

And then you receive some new "requirements", which end up making the "double" function async...

```javascript
async function asyncDouble(x){
  const result = x * 2;
  await someAPICall(result);
  return result;
}
```

Here are the changes you need to make:

```javascript
await ppipe(1)
  .pipe(add, 1)
  .pipe(asyncDouble)
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1); //3 (you can also use .then and .catch)
```

Yes, ppipe automatically turns the end result into a promise, if one or more functions in the 
chain return a promise. It also waits for the resolution and passes the unwrapped value to the 
next function. You can also catch the errors with .catch like a standard promise or use
try/catch in an async function. You meet the requirements and keep the code tidy.

For consistency, the .then and .catch methods are always available, so you don't have to care if
any function in the chain is async as long as you use those.

So, later you receive some new "requirements", which make our now infamous double function return
an object:

```javascript
async function asyncComplexDouble(x){
  const result = x * 2;
  const someInfo = await someAPICall(result);
  return { result, someInfo };
}
```

Still not a problem:

```javascript
await ppipe(1)
  .pipe(add, 1)
  .pipe(asyncComplexDouble)
  .pipe(square, _.result)
  //pipe._ is a proxy which saves the property accesses to pluck the prop from the previous
  //function's result later
  .pipe(divide, _, 8)
  .pipe(add, 1); //3
  
//well, if you think that might not be clear, you can write it like this, too
await ppipe(1)
  .pipe(add, 1)
  .pipe(asyncComplexDouble)
  .pipe(x => x.result)
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1); //3
  
//this also works
await ppipe(1)
  .pipe(add, 1)
  .pipe(asyncComplexDouble)
  //promises will be unboxed and properties will be returned as getter functions
  //the methods will be available in the chain as well, as shown in the next example
  .result()
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1); //3
```

Let's go one step further; what if you need to access a method from the result?

```javascript
async function advancedDouble(x){
  const result = x * 2;
  const someInfo = await someAPICall(result);
  return { 
    getResult() { return result }, 
    someInfo 
  };
}
```

There you go:

```javascript
await ppipe(1)
  .pipe(add, 1)
  .pipe(advancedDouble)
  .getResult()
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1); //3
```

## Additional Methods / Properties

### .with(ctx)

Calls the following function in chain with the given `this` value (ctx). After calling `.with` the
chain can be continued with the methods from the ctx.

```javascript
class Example {
  constructor(myInt) {
    this.foo = Promise.resolve(myInt);
  }
  addToFoo(x) {
    return this.foo.then(foo => foo + x);
  }
}
await ppipe(10).with(new Example(5)).addToFoo(_); //15
```

### .val

Gets the current value from the chain. Will be a promise if any function in the chain returns a
promise. Calling the chain with no parameters achieves the same result.

Look at the test/test.js for more examples.
