import isFunction from './lib/isFunction';
import getPropertyByPath from './getPropertyByPath';
import isPromise from './lib/isPromise';

// --- Placeholder ---
class Placeholder {
  constructor(public prop?: string, public expandTarget?: boolean) {}

  *[Symbol.iterator](): Generator<Placeholder> {
    yield new Placeholder(this.prop, true);
  }
}

const placeholderProxy = (prop?: string, expandTarget = false): any =>
  new Proxy(new Placeholder(prop, expandTarget), {
    get(target: Placeholder, name: string | symbol): any {
      if (typeof name === 'symbol') {
        return (target as any)[name];
      }
      if (Object.getOwnPropertyNames(target).includes(name)) {
        return (target as any)[name];
      }
      return placeholderProxy([prop, name].filter((x) => !!x).join('.'));
    },
  });

export const _: any = placeholderProxy();

// --- Type Definitions ---

export type Piped<T, TThis> = any;

export interface Ppipe {
  <T>(val: T, thisVal?: any, err?: Error): Piped<T, any>;
  extend<E extends Record<string, Function>>(newExtensions: E): Ppipe & E;
  _: any;
}

// --- Implementation ---

const unitFn = <T>(x: T): T => x;
const isUndef = (val: unknown): val is undefined => typeof val === 'undefined';
const truthy = (val: unknown): val is object | number | string | boolean => !isUndef(val) && val !== null;

function createPpipe(extensions: Record<string, Function> = {}): Ppipe {
  function ppipe<T>(val: T, thisVal?: any, err?: Error): Piped<T, any> {
    function pipe(fn: unknown, ...params: unknown[]): Piped<any, any> {
      if (isUndef(fn)) {
        if (truthy(err)) throw err;
        return val as any;
      }

      let effectiveFn = fn;
      if (!isFunction(effectiveFn)) {
        if (effectiveFn instanceof Placeholder && params.length === 0) {
          params = [effectiveFn];
          effectiveFn = unitFn;
        } else {
          throw new Error('first parameter to a pipe should be a function or a single placeholder');
        }
      }

      const callResultFn = (value: T): unknown => {
        const newParams = [...params];
        let replacedPlaceHolder = false;

        for (let i = newParams.length - 1; i >= 0; i--) {
          const pholdr = newParams[i];
          if (!(pholdr instanceof Placeholder)) continue;

          replacedPlaceHolder = true;
          const replacedParam = !pholdr.prop ? value : getPropertyByPath(value, pholdr.prop);

          if (pholdr.expandTarget === true && Array.isArray(replacedParam)) {
            newParams.splice(i, 1, ...replacedParam);
          } else {
            newParams.splice(i, 1, replacedParam);
          }
        }

        if (!replacedPlaceHolder) {
          newParams.push(value);
        }

        return (effectiveFn as Function).call(thisVal, ...newParams);
      };

      let res: unknown;
      if (isPromise<T>(val)) {
        res = val.then(callResultFn as (value: T) => unknown);
      } else {
        try {
          res = truthy(err) ? undefined : callResultFn(val);
        } catch (e) {
          err = e as Error;
        }
      }
      return ppipe(res, undefined, err);
    }

    const piped = new Proxy(pipe, {
      get(target: typeof pipe, name: string | symbol): any {
        if (typeof name !== 'string') return (target as any)[name];

        switch (name) {
          case 'then':
          case 'catch': {
            const res = truthy(err) ? Promise.reject(err) : Promise.resolve(val);
            const promiseMethod = res[name] as Function;
            return (...params: unknown[]) => promiseMethod.apply(res, params);
          }
          case 'val':
            if (truthy(err)) throw err;
            return val;
          case 'with':
            return (ctx: any): Piped<T, any> => {
              thisVal = ctx;
              return piped as Piped<T, any>;
            };
          case 'pipe':
            return piped;
          case 'bind':
          case 'call':
          case 'apply': {
            const method = target[name as keyof typeof target];
            return (...params: unknown[]) => (method as Function).apply(target, params);
          }
        }

        if (isPromise(val)) {
          return (...params: unknown[]) => ppipe(val, thisVal, err)((x: any) => {
            const prop = x?.[name];
            if (isUndef(prop)) {
              throw new TypeError(`${name} is not a function or property on ${x}`);
            }
            return isFunction(prop) ? prop.apply(x, params) : prop;
          });
        }

        const fnExistsInCtx = truthy(thisVal) && isFunction((thisVal as any)[name]);
        const valHasProp = !fnExistsInCtx && !isUndef(val) && !isUndef((val as any)[name]);
        const extensionWithNameExists = !fnExistsInCtx && !valHasProp && isFunction(extensions[name]);

        if (!fnExistsInCtx && !valHasProp && !extensionWithNameExists) {
          throw new TypeError(`${name} is not a function or property on ${val}`);
        }

        return (...params: unknown[]) => ppipe(val, thisVal, err)((x: any) => {
          const ctx = fnExistsInCtx ? thisVal : valHasProp ? x : extensions;
          const prop = fnExistsInCtx ? (thisVal as any)[name] : valHasProp ? x[name] : extensions[name];

          const newParams = (fnExistsInCtx || extensionWithNameExists) ? [...params, x] : params;
          if(!isFunction(prop)) return prop;

          const placeholderReplacedParams = newParams.map(p => p === _ ? x : p);

          return prop.apply(ctx, placeholderReplacedParams);
        });
      },
    }) as Piped<T, any>;

    return piped;
  }

  const ppipeWithExtensions = Object.assign(ppipe, {
    extend<E extends Record<string, Function>>(newExtensions: E) {
      return createPpipe({ ...extensions, ...newExtensions }) as Ppipe & E;
    },
    _,
  });

  return ppipeWithExtensions;
}

const ppipeInstance = createPpipe();
export default ppipeInstance;
