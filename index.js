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

function ppipe(val, thisVal) {
	const promised = Promise.resolve(val);
	const pipe = function(fn, ...params) {
		if (!fn) {
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
		const res = isPromise(val) ? val.then(callResultFn) : callResultFn(val);
		return ppipe(res);
	};
	return new Proxy(pipe, {
		get(target, name) {
			if (!!val[name]) {
				if (typeof val[name] !== "function") {
					return val[name];
				}
				const ctx = !!thisVal ? thisVal : val;
				return (...params) =>
					ppipe(val)((...params) => ctx[name](...params), ...params);
			}
			if (["then", "catch"].includes(name)) {
				return (...params) => promised[name](...params);
			}
			if (name === "val") {
				return val;
			}
			if (name === "with") {
				return ctx => ppipe(val, ctx);
			}
			if (name === "pipe") {
				return ppipe(val, thisVal);
			}
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
