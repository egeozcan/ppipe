# ppipe
pipes values through functions, an alternative to using the [proposed pipe operator](https://github.com/mindeavor/es-pipeline-operator) ( |> ) for ES.

Supports functions returning promises too. In that case, the result of the
chain will also be a promise. This is similar to the proposed support for
await in the chained functions.

## Installation

`npm install ppipe`

## All features at a glance

```javascript
/*for example's sake, just wraps the fn in a promise
which resolves with the returned value after a delay*/
function delay(fn) {
  return function () {
    var args = arguments;
    return new Promise(resolve => 
      setTimeout(() => 
        resolve(fn.apply(null, args)), 10));
  };
}

/* used for inserting the result to a specific location
in a multi-parameter function*/
var _ = ppipe._;

//doubleSay, quote, join and exclaim are not included for brevity.
ppipe("hello")
      (doubleSay)
      (delay(quote))
      (delay(join), _, "I said")
      (join, "and suddenly", _, "without thinking")
      (delay(exclaim))
      (exclaim).then(res => {
        assert.equal('and suddenly, "hello, hello", I said, without thinking!!', res);
      });

assert.equal(
  ppipe("hello")(doubleSay)(exclaim).val,
  "hello, hello!");
```

Look at the test/test.js for more examples.
