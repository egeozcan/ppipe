function isPromise(val) {
  return val && typeof val.then === "function";
}

function pipe(val, fn) {
  if (!fn) {
    return val;
  }
  let params = Array.from(arguments);
  params.splice(0, 2);
  let idx = params.indexOf(ppipe._);
  let deleteCount = idx >= 0 ? 1 : 0;
  if (isPromise(val)) {
    return ppipe(val.then(function(res) {
      params.splice(Math.max(idx, 0), deleteCount, res);
      return fn.apply(null, params);
    }));
  } else {
    params.splice(Math.max(idx, 0), deleteCount, val);
    return ppipe(fn.apply(null, params));
  }
}

let ppipe = function(val) {
  let res = pipe.bind(null, val);
  res.val = val;
  if (isPromise(val)) {
    res.then = val.then.bind(val);
    res.catch = val.catch.bind(val);
  } else {
    res.then = fn => fn(val);
  }
  return res;
}
ppipe._ = {};

module.exports = ppipe;