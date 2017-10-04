const isFn = val => typeof val === "function";
const isPromise = val => val && isFn(val.then);
const isUndef = val => typeof val === "undefined";
const truthy = val => !isUndef(val) && val !== null;

function ppipe(val, thisVal, err) {
	const pipe = function(fn, ...params) {
		if (isUndef(fn)) {
			if (truthy(err)) {
				throw err;
			}
			return val;
		}
		if (!isFn(fn)) {
			throw new Error("first parameter to a pipe should be a function");
		}
		const callResultFn = value => {
			let replacedPlaceHolder = false;
			for (let i = params.length; i >= 0; i--) {
				if (!(params[i] instanceof Placeholder)) {
					continue;
				}
				replacedPlaceHolder = true;
				const pholdr = params[i];
				const replacedParam = pholdr === ppipe._ ? value : value[pholdr.prop];
				params.splice(i, 1, replacedParam);
			}
			if (!replacedPlaceHolder) {
				params.splice(params.length, 0, value);
			}
			return fn.call(thisVal, ...params);
		};
		let res;
		if (isPromise(val)) {
			res = val.then(callResultFn);
		} else {
			try {
				res = truthy(err) ? undefined : callResultFn(val);
			} catch (e) {
				err = e;
			}
		}
		return ppipe(res, undefined, err);
	};
	const piped = new Proxy(pipe, {
		get(target, name) {
			switch (name) {
				case "then":
				case "catch": {
					const res = truthy(err) ? Promise.reject(err) : Promise.resolve(val);
					return (...params) => res[name](...params);
				}
				case "val":
					if (truthy(err)) {
						throw err;
					}
					return val;
				case "with":
					return ctx => {
						thisVal = ctx;
						return piped;
					};
				case "pipe":
					return piped;
				case "bind":
				case "call":
				case "apply":
					return (...params) => pipe[name](...params);
			}
			if (isPromise(val)) {
				return (...params) =>
					piped(x => {
						if (isUndef(x[name])) {
							throw new TypeError(`${name} is not defined on ${x}`);
						}
						return isFn(x[name]) ? x[name](...params) : x[name];
					});
			}
			if (!isUndef(val[name]) || (truthy(thisVal) && isFn(thisVal[name]))) {
				const ctx = truthy(thisVal) ? thisVal : val;
				return (...params) =>
					piped(
						(...replacedParams) =>
							!isFn(ctx[name])
								? ctx[name]
								: truthy(thisVal)
									? ctx[name](...replacedParams)
									: ctx[name](...params),
						...params
					);
			}
		}
	});
	return piped;
}

class Placeholder {
	constructor(prop) {
		this.prop = prop;
	}
}

ppipe._ = new Proxy(new Placeholder(), {
	get(target, name) {
		return new Placeholder(name);
	}
});

module.exports = ppipe;
