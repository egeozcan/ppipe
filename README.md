# [![PPIPE](logo/logo_s.png)](https://github.com/egeozcan/ppipe)

[![build](https://travis-ci.org/egeozcan/ppipe.svg?branch=master)](https://travis-ci.org/egeozcan/ppipe)
[![Coverage Status](https://coveralls.io/repos/github/egeozcan/ppipe/badge.svg?branch=master)](https://coveralls.io/github/egeozcan/ppipe?branch=master)
[![npm](https://img.shields.io/npm/v/ppipe.svg)](https://www.npmjs.com/package/ppipe)
[![npm](https://img.shields.io/npm/dt/ppipe.svg)](https://www.npmjs.com/package/ppipe)
[![license](https://img.shields.io/github/license/egeozcan/ppipe.svg)](https://github.com/egeozcan/ppipe/blob/master/LICENSE)
[![DeepScan Grade](https://deepscan.io/api/projects/565/branches/916/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=565&bid=916)

pipes values through functions, an alternative to using the [proposed pipe operator](https://github.com/mindeavor/es-pipeline-operator) ( |> ) for ES.

[Demo available on RunKit](https://runkit.com/egeozcan/ppipe).

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

*Order of arguments can be manipulated using the _ property of ppipe function. The result of
the previous function is inserted to its place if it exists in the arguments. It can also
occur more than once if you want to pass the same parameter more than once.*

```javascript
const ppipe = require("ppipe");
const _ = ppipe._;
ppipe(1)(add, 1)(double)(square)(divide, _, 8)(add, 1)(); // 3
```

If that is too lisp-y, you can also use ".pipe".

```javascript
ppipe(1)
  .pipe(add, 1)
  .pipe(double)
  .pipe(square)
  .pipe(divide, _, 8)
  .pipe(add, 1)(); // 3
```

And then you receive some new "requirements", which end up making the "double" function
async...

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
next function. You can also catch the errors with `.catch` like a standard promise or use
try/catch in an async function. You meet the requirements and keep the code tidy.

For consistency, the `.then` and `.catch` methods are always available, so you don't have to care
if any function in the chain is async as long as you use those.

So, later you receive some new "requirements", which make our now infamous double function 
return an object:

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
  //pipe._ is also a proxy which saves the property accesses to pluck the prop from the
  //previous function's result later
  .pipe(square, _.result)
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

## Advanced Functionality

### Chain Methods / Properties

You can use these from the chain (after creating one with `ppipe(val)`).

#### .with(ctx)

Calls the following function in chain with the given `this` value (ctx). After calling `.with`
the chain can be continued with the methods from the ctx.

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

Look at the test/test.js for more examples.

#### .val

Gets the current value from the chain. Will be a promise if any function in the chain returns a
promise. Calling the chain with no parameters achieves the same result.

### Extending Ppipe

You can create an extended instance of ppipe via `.extend`.

```javascript
const newPipe = ppipe.extend({
  divide (x, y) {
    return x / y;
  },
  log(...params) {
    console.log(...params);
    return params[params.length - 1];
  }
});
const res = await newPipe(10)
  .pipe(x => x + 1)
  .divide(_, 11)
  .log("here is our x: ") //logs "here is our x: 1"
  .pipe(x => x + 1) // 2
```

You can also call `.extend` on the extended ppipes. It will create a new ppipe with the new and
existing extensions merged.

## Testing

Clone the repository, install the dev dependencies and run the npm test command.

`npm install`

`npm test`

## Contributing

See [CONTRIBUTING](https://github.com/egeozcan/ppipe/blob/master/.github/CONTRIBUTING.md).

## Caveats

* This library was not written with performance in mind. So, it makes next to no sense to use
it in, say, a tight loop. Use in a web-server should be fine as long as you don't have tight
response-time requirements. General rule of thumb: Test it before putting it into prod. There
are a lot of tests written for ppipe but none of them measure performance. I may improve the
performance in the future (some low-hanging fruits) but I'd rather avoid making any guarantees.
Well, there is one good news: [Chrome team is working on performance improvements to the Proxy](https://v8project.blogspot.de/2017/10/optimizing-proxies.html)
which will very positively affect ppipe performance.

* It uses ES6 Proxies to do its magic. Proxies are not back-portable. 1.x.x versions of ppipe
didn't use proxies. So you can try using an older version with a transpiler if evergreen sounds
alien to you.
[Here](https://github.com/egeozcan/ppipe/blob/1888e9269be90f549d5c00002f7e800598c6d539/index.js)
is an older stable version without value extracting and context change support.

* ppipe is not typed. No type definition exists for TypeScript nor Flow. I actually love
TypeScript and would support it but the lack of variadic generic type parameters make it
next to impossible to provide type definitions for ppipe.
More can be read [here](https://github.com/Microsoft/TypeScript/issues/5453). Also, ppipe
is as dynamic as it gets, giving the ability to access virtual properties/methods which may
belong to the provided context, the processed value or any of the possible extensions.
[TypeScripts Type System is Turing Complete](https://github.com/Microsoft/TypeScript/issues/14833),
so, maybe there is a way to type all of this but I really need help about that.
