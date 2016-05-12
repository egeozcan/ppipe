var assert = require('chai').assert;
var ppipe = require('../index.js');

function doubleSay(str) {
  return str + ", " + str;
}
function capitalize(str) {
  return str[0].toUpperCase() + str.substring(1);
}
function delay(fn) {
  return function () {
    var args = arguments;
    return new Promise(resolve => setTimeout(() => resolve(fn.apply(null, args)), 10))
  };
}
function exclaim(str) {
  return str + '!';
}
function join() {
  var arr = Array.from(arguments);
  return arr.join(", "); 
}
function quote(str) {
  return '"' + str + '"';
}

var _ = ppipe._;

describe('ppipe', function () {
  var message = "hello";
  it('should correctly pass the params to the first fn', function () {
    assert.equal(
      ppipe(message)(doubleSay).val,
      doubleSay(message)
    );
  });
  
  it('should correctly pass the params to the second fn', function() {
    assert.equal(
      ppipe(message)(doubleSay)(exclaim).val,
      exclaim(doubleSay(message))
    );
  }); 
  
  it('should correctly insert parameters', function() {
    assert.equal(
      ppipe(message)(doubleSay)(join, _, "I said")(exclaim).val,
      exclaim(join(doubleSay(message), "I said"))
    );
  }); 
  
  it('should correctly insert parameters on multiple functions', function() {
    assert.equal(
      ppipe(message)(doubleSay)(join, _, "I said")(exclaim)(join, "and suddenly", _, "without thinking").val,
      join("and suddenly", exclaim(join(doubleSay(message), "I said")), "without thinking")
    );
  }); 
  
  var result = 'Hello!';
  
  it('should wrap promise factories in the middle of the chain', function() {
    return ppipe(message)(delay(capitalize))(exclaim).then(res => {
      return assert.equal(result, res);
    });
  });
  
  it('should wrap promise factories at the end of the chain', function() {
    return ppipe(message)(capitalize)(delay(exclaim)).then(res => {
      return assert.equal(result, res);
    });
  });
  
  it('should wrap promises in the beginning of the chain', function() {
    return ppipe(Promise.resolve(message))(capitalize)(exclaim).then(res => {
      return assert.equal(result, res);
    });
  });
  
  it('should wrap multiple promise factories and promises in chain', function() {
    return ppipe(Promise.resolve(message))(delay(capitalize))(delay(exclaim)).then(res => {
      return assert.equal(result, res);
    });
  });
  
  it('should be able to insert promise values as parameters', function() {
    return ppipe(message)
      (doubleSay)
      (delay(quote))
      (delay(join), _, "I said")
      (join, "and suddenly", _, "without thinking")
      (delay(exclaim))(exclaim).then(res => {
      return assert.equal('and suddenly, "hello, hello", I said, without thinking!!', res);
    })
  });
});

//ppipe("hello")(doubleSay)(capitalize)(join, "ok", _, "computer")(exclaim).val