function isPromise(val) {
	return val && typeof val.then === "function";
}

function pipe(val, fn, ...params) {
	if (!fn) {
		return val;
	}
	const idx = params.indexOf(ppipe._);
	const argumentPlaceholderExists = idx >= 0;
	const argumentInsertPosition = Math.max(idx, 0);
	const callResultFn = value => {
		params.splice(
			argumentInsertPosition,
			argumentPlaceholderExists ? 1 : 0,
			value
		);
		return fn.apply(null, params);
	};
	const res = isPromise(val) ? val.then(callResultFn) : callResultFn(val);
	return ppipe(res);
}

const ppipe = function(val) {
	const res = pipe.bind(null, val);
	res.val = val;
	const promised = Promise.resolve(val);
	return Object.assign(res, {
		then: promised.then.bind(promised),
		catch: promised.catch.bind(promised)
	});
};
ppipe._ = Symbol();

module.exports = ppipe;
