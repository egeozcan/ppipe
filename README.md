# ppipe
pipes values through functions, an alternative to using the [proposed pipe operator](https://github.com/mindeavor/es-pipeline-operator) ( |> ) for ES.

Supports functions returning promises too. In that case, the result of the
chain will also be a promise. This is similar to the proposed support for
await in the chained functions.

## Installation

`npm install ppipe`

## All features at a glance

```javascript

//this special object is a placeholder for the incoming value from the previous function in the chain
const _ = ppipe._;
const add = (x, y) => x + y;
const double = x => x + x;
const square = x => x * x;
const divide = (x, y) => x / y;

ppipe(1)
  (add, 1)
  (double)
  (square)
  (divide, _, 8) //order of arguments can be manipulated
  (add, 1)(); // 3

const repeat = x => [x, x].join(", ");
const quote = x => ['"', x, '"'].join('');
const join = (x, y, z) => [x, y, z].join(" ");
const exclaim = x => x + "!";
/*for example's sake, just wraps the fn in a promise
which resolves with the returned value after a 10ms delay*/
const delay = fn => (...args) =>
	new Promise(resolve => setTimeout(() => resolve(fn.apply(null, args)), 10));
const delayedQuote = delay(quote);
const delayedJoin = delay(join);
const delayedExclaim = delay(exclaim);

ppipe("hello")
  (repeat)
  //mixing it up with async functions
  (delayedQuote)
  //the result from the previous function will be the last argument to the next if there is no placeholder
  (delayedJoin, "I shouted")
  (join, "and suddenly", _, "without thinking")
  (delayedExclaim)
  //'and suddenly I shouted "hello, hello"  without thinking!!'
  (exclaim).then(res => console.log(res));

ppipe("hello")(repeat)(exclaim)(); //"hello, hello!"
```

Look at the test/test.js for more examples.