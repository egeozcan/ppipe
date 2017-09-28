function isPromise(val) {
	return val && typeof val.then === "function";
}

class Placeholder {
	constructor(prop) {
		this.prop = prop;
	}
	extractValue(val) {
		if (typeof this.prop === "undefined") {
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
			if (!!err) {
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
			res = !!err ? Promise.reject(err) : val.then(callResultFn);
		} else {
			try {
				res = !!err ? undefined : callResultFn(val);
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
					const res = !!err ? Promise.reject(err) : Promise.resolve(val);
					return res[name].bind(res);
				case "val":
					if (!!err) {
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
						x => (typeof x[name] === "function" ? x[name](...params) : x[name])
					);
			}
			if (
				typeof val[name] !== "undefined" ||
				(!!thisVal && typeof thisVal[name] === "function")
			) {
				const ctx = !!thisVal ? thisVal : val;
				return (...params) =>
					ppipe(val, thisVal, err)(
						(...replacedParams) =>
							typeof ctx[name] !== "function"
								? ctx[name]
								: !!thisVal
									? ctx[name](...replacedParams)
									: ctx[name](...params),
						...params
					);
			}
			if (!!pipe[name]) {
				if (typeof pipe[name] !== "function") {
					return pipe[name];
				}
				return pipe[name].bind(pipe);
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
