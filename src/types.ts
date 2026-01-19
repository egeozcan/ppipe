// ==========================================
// Type Definitions for ppipe
// ==========================================

// Branded placeholder type using unique symbol
// Export the symbol so it can be used in placeholder.ts
export const PlaceholderBrand: unique symbol = Symbol("ppipe.placeholder");
export type PlaceholderType = { readonly [PlaceholderBrand]: true };

// Async state tracking - determines if a type is a Promise
export type IsAsync<T> = T extends Promise<unknown> ? true : false;

// Extensions base type - a record with string keys
// The actual function types are preserved through the generic parameter E
// This avoids 'any' by not constraining the function signatures at the base level
export type Extensions = Record<string, unknown>;

// Helper to combine async states (true if either is true)
export type CombineAsync<A extends boolean, B extends boolean> = A extends true ? true : B extends true ? true : false;

// Type guard helper - checks if a value is a function
export type IsFunction<T> = T extends (...args: never[]) => unknown ? true : false;

// ==========================================
// Pipe Interface with Placeholder Overloads
// ==========================================

export interface Pipe<T, E extends Extensions = Record<string, never>, Async extends boolean = false> {
	// Basic pipe - value as only argument (no placeholder needed)
	pipe<R>(fn: (value: Awaited<T>) => R): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// No placeholder overloads (value appended at end)
	// ==========================================

	// 2 args - no placeholder, value goes at position 1
	pipe<A, R>(
		fn: (a: A, value: Awaited<T>) => R,
		a: A
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - no placeholder, value goes at position 2
	pipe<A, B, R>(
		fn: (a: A, b: B, value: Awaited<T>) => R,
		a: A,
		b: B
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - no placeholder, value goes at position 3
	pipe<A, B, C, R>(
		fn: (a: A, b: B, c: C, value: Awaited<T>) => R,
		a: A,
		b: B,
		c: C
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 1 argument
	// ==========================================

	// 1 arg with placeholder in position 0
	pipe<A, R>(fn: (a: A) => R, a: PlaceholderType): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 2 arguments
	// ==========================================

	// 2 args - placeholder at position 0
	pipe<A, B, R>(
		fn: (a: A, b: B) => R,
		a: PlaceholderType,
		b: B
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 2 args - placeholder at position 1
	pipe<A, B, R>(
		fn: (a: A, b: B) => R,
		a: A,
		b: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 2 args - placeholders at both positions
	pipe<A, R>(
		fn: (a: A, b: A) => R,
		a: PlaceholderType,
		b: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 3 arguments
	// ==========================================

	// 3 args - placeholder at position 0
	pipe<A, B, C, R>(
		fn: (a: A, b: B, c: C) => R,
		a: PlaceholderType,
		b: B,
		c: C
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholder at position 1
	pipe<A, B, C, R>(
		fn: (a: A, b: B, c: C) => R,
		a: A,
		b: PlaceholderType,
		c: C
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholder at position 2
	pipe<A, B, C, R>(
		fn: (a: A, b: B, c: C) => R,
		a: A,
		b: B,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholders at positions 0, 1
	pipe<A, C, R>(
		fn: (a: A, b: A, c: C) => R,
		a: PlaceholderType,
		b: PlaceholderType,
		c: C
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholders at positions 0, 2
	pipe<A, B, R>(
		fn: (a: A, b: B, c: A) => R,
		a: PlaceholderType,
		b: B,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholders at positions 1, 2
	pipe<A, B, R>(
		fn: (a: A, b: B, c: B) => R,
		a: A,
		b: PlaceholderType,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 3 args - placeholders at all positions
	pipe<A, R>(
		fn: (a: A, b: A, c: A) => R,
		a: PlaceholderType,
		b: PlaceholderType,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 4 arguments
	// ==========================================

	// 4 args - placeholder at position 0 only
	pipe<A, B, C, D, R>(
		fn: (a: A, b: B, c: C, d: D) => R,
		a: PlaceholderType,
		b: B,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - placeholder at position 1 only
	pipe<A, B, C, D, R>(
		fn: (a: A, b: B, c: C, d: D) => R,
		a: A,
		b: PlaceholderType,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - placeholder at position 2 only
	pipe<A, B, C, D, R>(
		fn: (a: A, b: B, c: C, d: D) => R,
		a: A,
		b: B,
		c: PlaceholderType,
		d: D
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - placeholder at position 3 only
	pipe<A, B, C, D, R>(
		fn: (a: A, b: B, c: C, d: D) => R,
		a: A,
		b: B,
		c: C,
		d: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - multiple placeholder combinations (most common ones)
	pipe<A, C, D, R>(
		fn: (a: A, b: A, c: C, d: D) => R,
		a: PlaceholderType,
		b: PlaceholderType,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	pipe<A, B, R>(
		fn: (a: A, b: B, c: A, d: B) => R,
		a: PlaceholderType,
		b: B,
		c: PlaceholderType,
		d: B
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// 4 args - all placeholders
	pipe<A, R>(
		fn: (a: A, b: A, c: A, d: A) => R,
		a: PlaceholderType,
		b: PlaceholderType,
		c: PlaceholderType,
		d: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Value extraction
	// ==========================================

	// Returns T for sync pipes, Promise<T> for async pipes
	// Use `await pipe.value` or `.then()` for consistent handling
	readonly value: T | Promise<T>;

	// Legacy alias for value
	readonly val: T | Promise<T>;

	// ==========================================
	// Promise interface
	// ==========================================

	then<TResult1 = Awaited<T>, TResult2 = never>(
		onFulfilled?: ((value: Awaited<T>) => TResult1 | PromiseLike<TResult1>) | null,
		onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2>;

	catch<TResult = never>(
		onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
	): Promise<Awaited<T> | TResult>;
}

// ==========================================
// Extension method mapping
// ==========================================

// Full pipe type with extensions (forward declaration for recursive reference)
export type PipeWithExtensions<T, E extends Extensions, Async extends boolean> = Pipe<T, E, Async> &
	ExtensionMethods<T, E, Async>;

// Maps extension functions to pipe methods
// Each extension fn(value, ...args) becomes pipe.fn(...args)
// Returns PipeWithExtensions to preserve extension methods through the chain
// Only maps keys where the value is a function
export type ExtensionMethods<_T, E extends Extensions, Async extends boolean> = {
	[K in keyof E as E[K] extends (...args: infer _Args) => unknown ? K : never]: E[K] extends (
		value: infer _V,
		...args: infer A
	) => infer R
		? (...args: A) => PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>
		: never;
};

// ==========================================
// Factory interface
// ==========================================

export interface PipeFactory<E extends Extensions = Record<string, never>> {
	<T>(value: T): PipeWithExtensions<T, E, IsAsync<T>>;
	readonly _: PlaceholderType;
	extend<NewE extends Extensions>(ext: NewE): PipeFactory<E & NewE>;
}
