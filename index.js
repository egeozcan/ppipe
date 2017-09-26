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
	return new Proxy(pipe, {
		get(target, name) {
			let res;
			if (!!val[name]) {
				return typeof val[name] === "function"
					? (...params) => ppipe(val[name].apply(val, params))
					: val[name];
			}
			if (!!promised[name]) {
				return typeof promised[name] === "function"
					? promised[name].bind(promised)
					: promised[name];
			}
			if (name === "val") {
				return val;
			}
		}
	});
}

ppipe._ = placeHolder;

module.exports = ppipe;
