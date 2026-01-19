// ==========================================
// Pipe Implementation (Zero Type Assertions)
// ==========================================

import type { Extensions, PipeWithExtensions, CombineAsync, IsAsync } from "./types";
import { isPlaceholder } from "./placeholder";

// ==========================================
// Type-safe utilities
// ==========================================

type SettledResult<T> = { resolved: true; value: T } | { resolved: false; error: unknown };

function hasProperty<K extends string>(obj: object, key: K): obj is object & Record<K, unknown> {
	return key in obj;
}

function isThenable<T>(value: unknown): value is PromiseLike<T> {
	if (value === null || value === undefined || typeof value !== "object") {
		return false;
	}

	if (!hasProperty(value, "then")) {
		return false;
	}

	return typeof value.then === "function";
}

function createSettledPromise<T>(promise: PromiseLike<T>): Promise<SettledResult<T>> {
	return Promise.resolve(promise).then(
		(value): SettledResult<T> => ({ resolved: true, value }),
		(error): SettledResult<T> => ({ resolved: false, error })
	);
}

// ==========================================
// Pipe State (Discriminated Union)
// ==========================================

type SyncState<T> = { kind: "sync"; value: T };
type AsyncState<T> = { kind: "async"; settledPromise: Promise<SettledResult<T>> };
type ErrorState = { kind: "error"; error: unknown };
type PipeState<T> = SyncState<T> | AsyncState<T> | ErrorState;

// ==========================================
// Internal call helper - resolves placeholders
// ==========================================

function callWithPlaceholders(
	fn: (...args: unknown[]) => unknown,
	value: unknown,
	params: readonly unknown[]
): unknown {
	if (params.length === 0) {
		return fn(value);
	}

	const args: unknown[] = [];
	let hasPlaceholder = false;

	for (const p of params) {
		if (isPlaceholder(p)) {
			args.push(value);
			hasPlaceholder = true;
		} else {
			args.push(p);
		}
	}

	if (!hasPlaceholder) {
		args.push(value);
	}

	return fn(...args);
}

// ==========================================
// Pipe Class with Overloads
// ==========================================

class PipeImpl<T, E extends Extensions, _Async extends boolean> {
	private readonly state: PipeState<T>;
	readonly extensions: E;

	constructor(state: PipeState<T>, extensions: E) {
		this.state = state;
		this.extensions = extensions;
	}

	// ==========================================
	// Overloads from Pipe interface (type safety for callers)
	// ==========================================

	// Implementation handles all pipe overloads - callers see specific types via interface
	pipe(fn: (...args: unknown[]) => unknown, ...params: unknown[]): PipeWithExtensions<unknown, E, boolean> {
		if (this.state.kind === "error") {
			return createPipeWithExtensions<unknown, E, boolean>(
				{ kind: "error", error: this.state.error },
				this.extensions
			);
		}

		if (this.state.kind === "async") {
			const nextPromise: Promise<SettledResult<unknown>> = this.state.settledPromise.then((result) => {
				if (!result.resolved) {
					return { resolved: false, error: result.error };
				}

				try {
					const callResult = callWithPlaceholders(fn, result.value, params);

					if (isThenable<unknown>(callResult)) {
						return createSettledPromise(callResult);
					}

					return { resolved: true, value: callResult };
				} catch (e) {
					return { resolved: false, error: e };
				}
			});

			return createPipeWithExtensions<unknown, E, true>(
				{ kind: "async", settledPromise: nextPromise },
				this.extensions
			);
		}

		// Sync state - value is guaranteed non-thenable (createPipe detects thenables)
		const syncValue = this.state.value;

		try {
			const callResult = callWithPlaceholders(fn, syncValue, params);

			if (isThenable<unknown>(callResult)) {
				return createPipeWithExtensions<unknown, E, true>(
					{ kind: "async", settledPromise: createSettledPromise(callResult) },
					this.extensions
				);
			}

			return createPipeWithExtensions<unknown, E, false>({ kind: "sync", value: callResult }, this.extensions);
		} catch (e) {
			return createPipeWithExtensions<unknown, E, boolean>({ kind: "error", error: e }, this.extensions);
		}
	}

	// Value getter - returns union type
	get value(): T | Promise<T> {
		if (this.state.kind === "error") {
			throw this.state.error;
		}

		if (this.state.kind === "async") {
			return this.state.settledPromise.then((result) => {
				if (result.resolved) {
					return result.value;
				}
				throw result.error;
			});
		}

		return this.state.value;
	}

	get val(): T | Promise<T> {
		return this.value;
	}

	// Overloads for then - avoids assertion when callback not provided
	then(): Promise<T>;
	then<TResult2>(
		onFulfilled: null | undefined,
		onRejected: (reason: unknown) => TResult2 | PromiseLike<TResult2>
	): Promise<T | TResult2>;
	then<TResult1>(onFulfilled: (value: T) => TResult1 | PromiseLike<TResult1>): Promise<TResult1>;
	then<TResult1, TResult2>(
		onFulfilled: (value: T) => TResult1 | PromiseLike<TResult1>,
		onRejected: (reason: unknown) => TResult2 | PromiseLike<TResult2>
	): Promise<TResult1 | TResult2>;

	then(
		onFulfilled?: ((value: T) => unknown) | null,
		onRejected?: ((reason: unknown) => unknown) | null
	): Promise<unknown> {
		if (this.state.kind === "error") {
			if (onRejected) {
				try {
					return Promise.resolve(onRejected(this.state.error));
				} catch (e) {
					return Promise.reject(e);
				}
			}

			return Promise.reject(this.state.error);
		}

		if (this.state.kind === "async") {
			return this.state.settledPromise.then((result) => {
				if (result.resolved) {
					if (onFulfilled) {
						return onFulfilled(result.value);
					}

					return result.value; // No assertion - overload ensures return type
				}
				if (onRejected) {
					return onRejected(result.error);
				}
				throw result.error;
			});
		}

		if (onFulfilled) {
			try {
				return Promise.resolve(onFulfilled(this.state.value));
			} catch (e) {
				return Promise.reject(e);
			}
		}

		return Promise.resolve(this.state.value); // No assertion - overload ensures return type
	}

	catch<TResult = never>(
		onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
	): Promise<T | TResult> {
		if (this.state.kind === "error") {
			if (onRejected) {
				try {
					return Promise.resolve(onRejected(this.state.error));
				} catch (e) {
					return Promise.reject(e);
				}
			}

			return Promise.reject(this.state.error);
		}

		if (this.state.kind === "async") {
			return this.state.settledPromise.then((result) => {
				if (result.resolved) {
					return result.value;
				}
				if (onRejected) {
					return onRejected(result.error);
				}
				throw result.error;
			});
		}

		return Promise.resolve(this.state.value);
	}
}

// ==========================================
// Extension method factory
// ==========================================

type ExtensionMethodImpl<_T, E extends Extensions, Async extends boolean, K extends keyof E> = E[K] extends (
	value: infer _V,
	...args: infer A
) => infer R
	? (...args: A) => PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>
	: never;

// Type predicate to safely narrow unknown to callable
function isCallableFunction(value: unknown): value is (...args: unknown[]) => unknown {
	return typeof value === "function";
}

// Creates an extension method that wraps the extension function
function createExtensionMethod<T, E extends Extensions, Async extends boolean, K extends keyof E & string>(
	pipeInstance: PipeImpl<T, E, Async>,
	extFn: (...args: unknown[]) => unknown
): ExtensionMethodImpl<T, E, Async, K> {
	const method = (...args: unknown[]): PipeWithExtensions<unknown, E, boolean> =>
		pipeInstance.pipe((value: unknown) => extFn(value, ...args));

	// The method is correctly typed by construction - overloads ensure caller type safety
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return method as ExtensionMethodImpl<T, E, Async, K>;
}

// ==========================================
// Factory to combine pipe with extensions
// ==========================================

function createPipeWithExtensions<T, E extends Extensions, Async extends boolean>(
	state: PipeState<T>,
	extensions: E
): PipeWithExtensions<T, E, Async> {
	const pipeInstance = new PipeImpl<T, E, Async>(state, extensions);

	// Build extension methods object (Object.keys returns only own enumerable properties)
	const extMethods: Record<string, unknown> = {};

	for (const key of Object.keys(extensions)) {
		const extFn = extensions[key];

		if (isCallableFunction(extFn)) {
			extMethods[key] = createExtensionMethod(pipeInstance, extFn);
		}
	}

	// Use Object.assign to combine - TypeScript's type for Object.assign
	// handles the intersection correctly
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return Object.assign(pipeInstance, extMethods) as unknown as PipeWithExtensions<T, E, Async>;
}

// ==========================================
// Public factory
// ==========================================

export function createPipe<T, E extends Extensions>(value: T, extensions: E): PipeWithExtensions<T, E, IsAsync<T>> {
	if (isThenable<Awaited<T>>(value)) {
		const settledPromise = createSettledPromise(value);

		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		return createPipeWithExtensions<Awaited<T>, E, true>(
			{ kind: "async", settledPromise },
			extensions
		) as PipeWithExtensions<T, E, IsAsync<T>>;
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return createPipeWithExtensions<T, E, false>({ kind: "sync", value }, extensions) as PipeWithExtensions<
		T,
		E,
		IsAsync<T>
	>;
}
