const isPromise = val => val && typeof val.then === "function";
const isFn = val => typeof val === "function";
const isUndef = val => typeof val === "undefined";
const truthy = val => !isUndef(val) && val !== null;

class Placeholder {
	constructor(prop) {
		this.prop = prop;
	}
	extractValue(val) {
		if (isUndef(this.prop)) {
			return val;
		}
		return val[this.prop];
	}
}

function findIndex(params) {
	for (let i = params.length - 1; i >= 0; i--) {
		if (params[i] instanceof Placeholder) {
			return i;
		}
	}
	return -1;
}

function ppipe(val, thisVal, err) {
	const pipe = function(fn, ...params) {
		if (!fn) {
			if (truthy(err)) {
				throw err;
			}
			return val;
		}
		const callResultFn = value => {
			let replacedPlaceHolder = false;
			while (true) {
				const plHoldrIdx = findIndex(params);
				if (plHoldrIdx === -1) break;
				replacedPlaceHolder = true;
				const curPlHolder = params[plHoldrIdx];
				params.splice(plHoldrIdx, 1, curPlHolder.extractValue(value));
			}
			if (!replacedPlaceHolder) {
				params.splice(params.length, 0, value);
			}
			return fn.call(thisVal, ...params);
		};
		let res;
		if (isPromise(val)) {
			res = truthy(err) ? Promise.reject(err) : val.then(callResultFn);
		} else {
			try {
				res = truthy(err) ? undefined : callResultFn(val);
			} catch (e) {
				err = e;
			}
		}
		return ppipe(res, undefined, err);
	};
	return new Proxy(pipe, {
		get(target, name) {
			switch (name) {
				case "then":
				case "catch":
					const res = truthy(err) ? Promise.reject(err) : Promise.resolve(val);
					return (...params) => res[name](...params);
				case "val":
					if (truthy(err)) {
						throw err;
					}
					return val;
				case "with":
					return ctx => ppipe(val, ctx, err);
				case "pipe":
					return ppipe(val, thisVal, err);
			}
			if (isPromise(val)) {
				return (...params) =>
					ppipe(val, thisVal, err)(
						x => (isFn(x[name]) ? x[name](...params) : x[name])
					);
			}
			if (
				!isUndef(val[name]) ||
				(truthy(thisVal) && typeof thisVal[name] === "function")
			) {
				const ctx = truthy(thisVal) ? thisVal : val;
				return (...params) =>
					ppipe(val, thisVal, err)(
						(...replacedParams) =>
							!isFn(ctx[name])
								? ctx[name]
								: truthy(thisVal)
									? ctx[name](...replacedParams)
									: ctx[name](...params),
						...params
					);
			}
			if (truthy(pipe[name])) {
				if (isFn(pipe[name])) {
					return pipe[name];
				}
				return (...params) => pipe[name](...params);
			}
			return (...params) => ppipe(val, thisVal, err)(x => x, ...params);
		}
	});
}

ppipe._ = new Proxy(new Placeholder(), {
	get(target, name) {
		if (name === "extractValue") {
			return (...params) => target.extractValue(...params);
		}
		return new Placeholder(name);
	}
});

module.exports = ppipe;
