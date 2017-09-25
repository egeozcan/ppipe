function isPromise(val) {
	return val && typeof val.then === "function";
}

function ppipe(val) {
	const promised = Promise.resolve(val);
	const pipe = function(fn, ...params) {
		if (!fn) {
			return val;
		}
		const idx = params.indexOf(ppipe._);
		const argumentPlaceholderExists = idx >= 0;
		const argumentInsertPos = argumentPlaceholderExists ? idx : params.length;
		const callResultFn = value => {
			params.splice(
				argumentInsertPos,
				argumentPlaceholderExists ? 1 : 0,
				value
			);
			return fn(...params);
		};
		const res = isPromise(val) ? val.then(callResultFn) : callResultFn(val);
		return ppipe(res);
	};
	pipe.val = val;
	pipe.then = promised.then.bind(promised);
	pipe.catch = promised.catch.bind(promised);
	return pipe;
}

ppipe._ = Symbol();

module.exports = ppipe;
