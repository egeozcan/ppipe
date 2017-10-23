// @ts-check

const isFn = val => typeof val === "function";
const isPromise = val => val && isFn(val.then);
const isUndef = val => typeof val === "undefined";
const truthy = val => !isUndef(val) && val !== null;

/**
 * Creates a pipe creator with the given extensions available in the chain
 * @param TExt 
 * @template TExt
 */
function createPpipe(extensions = {}) {
	/**
	 * Creates a new chain
	 * @param {(TVal | PromiseLike<TVal>)} val 
	 * @param {TThis} thisVal
	 * @param {Error} err 
	 * @template TVal, TThis
	 */
	const ppipe = (val, thisVal, err) => {
		/**
		 * Next step of the chain, callable with a function and the parameters to use
		 * while calling it, as rest parameters (params).
		 * @param {function(...any): TRes} fn 
		 * @param {...any} params 
	 	 * @template TRes
		 */
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
			/** @type {(TRes | PromiseLike<TRes>)} */
			let res;
			if (isPromise(val)) {
				const promiseVal = Promise.resolve(val);
				res = promiseVal.then(callResultFn);
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
						return (...params) =>
							name === "then" ? res.then(...params) : res.catch(...params);
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
						return (...params) => {
							//somehow just passing the "...params" makes TS unhappy
							return pipe[name](params[0], ...params.slice(1));
						};
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
				const extensionWithNameExists =
					!fnExistsInCtx && !valHasProp && isFn(extensions[name]);
				if (fnExistsInCtx || valHasProp || extensionWithNameExists) {
					const ctx = fnExistsInCtx ? thisVal : valHasProp ? val : extensions;
					return (...params) =>
						piped((...replacedParams) => {
							const newParams =
								fnExistsInCtx || extensionWithNameExists
									? replacedParams
									: params;
							return !isFn(ctx[name]) ? ctx[name] : ctx[name](...newParams);
						}, ...params);
				}
			}
		});
		return piped;
	};
	return Object.assign(ppipe, {
		extend(newExtensions) {
			return createPpipe(Object.assign(newExtensions, extensions));
		},
		_
	});
}
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
