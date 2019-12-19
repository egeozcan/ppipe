const isFn = require("./lib/isFunction");
const getPropertyByPath = require("./getPropertyByPath");
const isPromise = require("./lib/isPromise");
const unitFn = (x: any) => x;
const isUndef = (val: any) => typeof val === "undefined";
const truthy = (val: any) => !isUndef(val) && val !== null;

type anyFunction = (...args: any) => any;

function createPpipe(extensions = {}) {
	const ppipe = (val: any, thisVal: any, err: Error) => {
		const pipe = function<T extends (anyFunction | Placeholder)> (fn: T, ...params: T extends anyFunction ? Parameters<T> : any[]) {
			if (isUndef(fn)) {
				if (truthy(err)) {
					throw err;
				}
				return val;
			}
			if (!isFn(fn)) {
				if (fn instanceof Placeholder && params.length === 0) {
					params = [fn];
					fn = unitFn;
				} else {
					throw new Error(
						"first parameter to a pipe should be a function or a single placeholder"
					);
				}
			}
			const callResultFn = value => {
				let replacedPlaceHolder = false;
				for (let i = params.length; i >= 0; i--) {
					const pholdr = params[i];
					if (!(pholdr instanceof Placeholder)) {
						continue;
					}
					replacedPlaceHolder = true;
					const replacedParam = !pholdr.prop
						? value
						: getPropertyByPath(value, pholdr.prop);
					pholdr.expandTarget === true
						? params.splice(i, 1, ...replacedParam)
						: params.splice(i, 1, replacedParam);
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
							return pipe[name](...params);
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
	prop: string;

	* [Symbol.iterator]() {
		yield new Placeholder(this.prop, true);
	}

	constructor(prop: string, expandTarget) {
		this.prop = prop;
		this.expandTarget = expandTarget;
	}
}

const placeholderProxy = (prop = undefined, expandTarget = false) => {
	return new Proxy(new Placeholder(prop, expandTarget), {
		get(target, name) {
			if (
				name === Symbol.iterator ||
				Object.getOwnPropertyNames(target).includes(name)
			) {
				return target[name];
			}
			return placeholderProxy([prop, name].filter(x => !!x).join("."));
		}
	});
};

const _ = placeholderProxy();

module.exports = createPpipe();
