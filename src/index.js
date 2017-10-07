const isFn = val => typeof val === "function";
const isPromise = val => val && isFn(val.then);
const isUndef = val => typeof val === "undefined";
const truthy = val => !isUndef(val) && val !== null;

const createPpipe = (...extensions) => {
	const ppipe = (val, thisVal, err) => {
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
					const replacedParam = pholdr === _ ? value : value[pholdr.prop];
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
						const res = truthy(err)
							? Promise.reject(err)
							: Promise.resolve(val);
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
				const fnExistsInCtx = truthy(thisVal) && isFn(thisVal[name]);
				const valHasProp = !fnExistsInCtx && !isUndef(val[name]);
				if (valHasProp || fnExistsInCtx) {
					const ctx = truthy(thisVal) ? thisVal : val;
					return (...params) =>
						piped((...replacedParams) => {
							const newParams = truthy(thisVal) ? replacedParams : params;
							return !isFn(ctx[name]) ? ctx[name] : ctx[name](...newParams);
						}, ...params);
				}
			}
		});
		return piped;
	};
	ppipe._ = _;
	ppipe.extend = newExtensions => createPpipe(...extensions, ...newExtensions);
	return ppipe;
};
class Placeholder {
	constructor(prop) {
		this.prop = prop;
	}
}

const _ = new Proxy(new Placeholder(), {
	get(target, name) {
		return new Placeholder(name);
	}
});

module.exports = createPpipe();
