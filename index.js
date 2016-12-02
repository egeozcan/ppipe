function isPromise(val) {
  return val && typeof val.then === "function";
}

function pipe(val, fn) {
  if (!fn) {
    return val;
  }
  let params = Array.from(arguments);
  //remove val and fn from the params
  params.splice(0, 2);
  let idx = params.indexOf(ppipe._);
  let deleteCount = 0;
  let startIndex = 0;
  if(idx >= 0) {
    deleteCount = 1;
    startIndex = idx;
  }
  let res;
  if (isPromise(val)) {
    res = val.then(function(promisedVal) {
      params.splice(startIndex, deleteCount, promisedVal);
      return fn.apply(null, params);
    });
  } else {
    params.splice(startIndex, deleteCount, val);
    res = fn.apply(null, params);
  }
  return ppipe(res);
}

const ppipe = function(val) {
  const res = pipe.bind(null, val);
  res.val = val;
  if (isPromise(val)) {
    res.then = val.then.bind(val);
    res.catch = val.catch.bind(val);
  } else {
    res.then = (success, fail) => {
      const promise = Promise.resolve(val).then(success);
      return fail ? promise.catch(fail) : promise;
    };
  }
  return res;
}
ppipe._ = {};

module.exports = ppipe;
