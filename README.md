# ppipe
pipes values through functions, an alternative to using the [proposed pipe operator](https://github.com/mindeavor/es-pipeline-operator) ( |> ) for ES

## All features at a glance

```javascript
function delay(fn) {
  return function () {
    var args = arguments;
    return new Promise(resolve => setTimeout(() => resolve(fn.apply(null, args)), 10))
  };
}

ppipe(message)
      (doubleSay)
      (delay(quote))
      (delay(join), _, "I said")
      (join, "and suddenly", _, "without thinking")
      (delay(exclaim))(exclaim).then(res => {
        assert.equal('and suddenly, "hello, hello", I said, without thinking!!', res);
      });
```

Look at the test/test.js for more examples.
