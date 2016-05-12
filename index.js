function isPromise(val) {
  return val && typeof val.then === "function";
}

function pipe(val, fn) {
  let params = Array.from(arguments);
  params.splice(0, 2);
  let idx = params.indexOf(ppipe._);
  let deleteCount = idx >= 0 ? 1 : 0;
  if (isPromise(val)) {
    let onResolve = res => {
      params.splice(Math.max(idx, 0), deleteCount, res);
      var newVal = fn.apply(null, params);
      return newVal;
    }
    return ppipe(val.then(onResolve));
  } else {
    params.splice(Math.max(idx, 0), deleteCount, val);
    return ppipe(fn.apply(null, params));
  }
}

let ppipe = function(val) {
  var res = pipe.bind(null, val);
  res.val = val;
  if (isPromise(val)) {
    res.then = val.then.bind(val);
  } else {
    res.then = fn => fn(val);
  }
  return res;
}
ppipe._ = {};

module.exports = ppipe;