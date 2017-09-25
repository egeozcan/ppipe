function isPromise(val) {
	return val && typeof val.then === "function";
}

const placeHolder = Symbol();

function ppipe(val) {
	const promised = Promise.resolve(val);
	const pipe = function(fn, ...params) {
		if (!fn) {
			return val;
		}
		const plHoldrIdx = params.indexOf(placeHolder);
		const plHoldrExists = plHoldrIdx >= 0;
		const argumentInsPos = plHoldrExists ? plHoldrIdx : params.length;
		const callResultFn = value => {
			params.splice(argumentInsPos, plHoldrExists ? 1 : 0, value);
			return fn(...params);
		};
		const res = isPromise(val) ? val.then(callResultFn) : callResultFn(val);
		return ppipe(res);
	};
	pipe.val = val;
	pipe.then = (...args) => promised.then(...args);
	pipe.catch = (...args) => promised.catch(...args);
	return pipe;
}

ppipe._ = placeHolder;

module.exports = ppipe;
