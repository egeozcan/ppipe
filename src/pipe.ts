// ==========================================
// Pipe Class Implementation
// ==========================================

import type { Extensions, PipeWithExtensions } from './types';
import { isPlaceholder } from './placeholder';

// ==========================================
// Utility functions
// ==========================================

function isPromise(value: unknown): value is Promise<unknown> {
  return (
    value !== null &&
    value !== undefined &&
    typeof (value as Promise<unknown>).then === 'function'
  );
}

// ==========================================
// Internal Pipe State
// ==========================================

interface PipeState<T, E extends Extensions> {
  value: T;
  extensions: E;
  error?: unknown;
  // For async values, we track a "settled" promise that handles its own rejection
  settledPromise?: Promise<{ resolved: true; value: unknown } | { resolved: false; error: unknown }>;
}

// Helper to create a settled promise that captures both success and failure
function createSettledPromise<T>(promise: Promise<T>): Promise<{ resolved: true; value: T } | { resolved: false; error: unknown }> {
  return promise.then(
    (value) => ({ resolved: true as const, value }),
    (error) => ({ resolved: false as const, error })
  );
}

// ==========================================
// Create Pipe with Proxy
// ==========================================

function createPipeProxy<T, E extends Extensions>(
  state: PipeState<T, E>
): PipeWithExtensions<T, E, T extends Promise<unknown> ? true : false> {
  // Core pipe function
  function pipe<R>(
    fn: (value: Awaited<T>) => R,
    ...params: unknown[]
  ): PipeWithExtensions<Awaited<R>, E, boolean> {
    // If there's an existing error, propagate it
    if (state.error !== undefined) {
      return createPipeProxy<Awaited<R>, E>({
        value: undefined as Awaited<R>,
        extensions: state.extensions,
        error: state.error,
      }) as PipeWithExtensions<Awaited<R>, E, boolean>;
    }

    const callResultFn = (value: unknown): R => {
      // Replace placeholders with the value
      const resolvedParams = params.map((param) =>
        isPlaceholder(param) ? value : param
      );

      // If no placeholders were found, append value at the end
      const hasPlaceholder = params.some(isPlaceholder);
      if (!hasPlaceholder && params.length > 0) {
        resolvedParams.push(value);
      } else if (params.length === 0) {
        resolvedParams.push(value);
      }

      return fn(...(resolvedParams as [Awaited<T>]));
    };

    // Handle async values (including settled promises)
    if (state.settledPromise) {
      // Chain off the settled promise
      const nextSettled = state.settledPromise.then((result) => {
        if (!result.resolved) {
          // Propagate the error
          return { resolved: false as const, error: result.error };
        }

        try {
          const fnResult = callResultFn(result.value);

          // If the result is a promise, we need to settle it
          if (isPromise(fnResult)) {
            return createSettledPromise(fnResult);
          }

          return { resolved: true as const, value: fnResult };
        } catch (e) {
          return { resolved: false as const, error: e };
        }
      });

      return createPipeProxy<Awaited<R>, E>({
        value: undefined as Awaited<R>,
        extensions: state.extensions,
        settledPromise: nextSettled as Promise<{ resolved: true; value: unknown } | { resolved: false; error: unknown }>,
      }) as PipeWithExtensions<Awaited<R>, E, boolean>;
    }

    // Handle raw Promise values (first time seeing a promise)
    if (isPromise(state.value)) {
      const settledPromise = createSettledPromise(state.value).then((result) => {
        if (!result.resolved) {
          return { resolved: false as const, error: result.error };
        }

        try {
          const fnResult = callResultFn(result.value);

          if (isPromise(fnResult)) {
            return createSettledPromise(fnResult);
          }

          return { resolved: true as const, value: fnResult };
        } catch (e) {
          return { resolved: false as const, error: e };
        }
      });

      return createPipeProxy<Awaited<R>, E>({
        value: undefined as Awaited<R>,
        extensions: state.extensions,
        settledPromise: settledPromise as Promise<{ resolved: true; value: unknown } | { resolved: false; error: unknown }>,
      }) as PipeWithExtensions<Awaited<R>, E, boolean>;
    }

    // Sync execution with error handling
    try {
      const result = callResultFn(state.value);

      // If the result is a Promise, convert to settled promise pattern
      if (isPromise(result)) {
        const settledPromise = createSettledPromise(result);

        return createPipeProxy<Awaited<R>, E>({
          value: undefined as Awaited<R>,
          extensions: state.extensions,
          settledPromise: settledPromise as Promise<{ resolved: true; value: unknown } | { resolved: false; error: unknown }>,
        }) as PipeWithExtensions<Awaited<R>, E, boolean>;
      }

      return createPipeProxy<Awaited<R>, E>({
        value: result as Awaited<R>,
        extensions: state.extensions,
      }) as PipeWithExtensions<Awaited<R>, E, boolean>;
    } catch (e) {
      return createPipeProxy<Awaited<R>, E>({
        value: undefined as Awaited<R>,
        extensions: state.extensions,
        error: e,
      }) as PipeWithExtensions<Awaited<R>, E, boolean>;
    }
  }

  // Value getter
  function getValue(): T {
    if (state.error !== undefined) {
      throw state.error;
    }
    if (state.settledPromise) {
      // For async values, return a promise that resolves/rejects appropriately
      return state.settledPromise.then((result) => {
        if (result.resolved) {
          return result.value;
        }
        throw result.error;
      }) as T;
    }
    return state.value;
  }

  // Promise interface - then
  function thenFn<TResult1 = Awaited<T>, TResult2 = never>(
    onFulfilled?: ((value: Awaited<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    // Handle sync errors
    if (state.error !== undefined) {
      if (onRejected) {
        try {
          const result = onRejected(state.error);
          return Promise.resolve(result);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(state.error);
    }

    // Handle settled async values
    if (state.settledPromise) {
      return state.settledPromise.then((result) => {
        if (result.resolved) {
          if (onFulfilled) {
            return onFulfilled(result.value as Awaited<T>);
          }
          return result.value as TResult1;
        } else {
          if (onRejected) {
            return onRejected(result.error);
          }
          throw result.error;
        }
      });
    }

    // Handle sync values
    if (onFulfilled) {
      try {
        const result = onFulfilled(state.value as Awaited<T>);
        return Promise.resolve(result);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.resolve(state.value as unknown as TResult1);
  }

  // Promise interface - catch
  function catchFn<TResult = never>(
    onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<Awaited<T> | TResult> {
    // Handle sync errors
    if (state.error !== undefined) {
      if (onRejected) {
        try {
          const result = onRejected(state.error);
          return Promise.resolve(result);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(state.error);
    }

    // Handle settled async values
    if (state.settledPromise) {
      return state.settledPromise.then((result) => {
        if (result.resolved) {
          return result.value as Awaited<T>;
        } else {
          if (onRejected) {
            return onRejected(result.error);
          }
          throw result.error;
        }
      });
    }

    // Handle sync values - no error to catch
    return Promise.resolve(state.value as Awaited<T>);
  }

  // Create proxy object
  const pipeObj = {
    pipe,
    get value() {
      return getValue();
    },
    get val() {
      return getValue();
    },
    then: thenFn,
    catch: catchFn,
  };

  // Create a proxy to handle extension methods dynamically
  return new Proxy(pipeObj, {
    get(target, prop: string | symbol) {
      // Check built-in properties first
      if (prop === 'pipe') {
        return target.pipe;
      }
      if (prop === 'value' || prop === 'val') {
        return target.value;
      }
      if (prop === 'then') {
        return target.then;
      }
      if (prop === 'catch') {
        return target.catch;
      }

      // Check if it's an extension method
      const propName = prop as string;
      const extensions = state.extensions;
      if (propName in extensions && typeof extensions[propName] === 'function') {
        const extensionFn = extensions[propName];
        return (...args: unknown[]) => {
          // Extension functions receive the value as first argument
          return pipe((val: unknown) => extensionFn(val, ...args));
        };
      }

      // Return undefined for unknown properties
      return undefined;
    },
  }) as unknown as PipeWithExtensions<T, E, T extends Promise<unknown> ? true : false>;
}

// ==========================================
// Public factory function
// ==========================================

export function createPipe<T, E extends Extensions>(
  value: T,
  extensions: E
): PipeWithExtensions<T, E, T extends Promise<unknown> ? true : false> {
  return createPipeProxy({ value, extensions });
}
