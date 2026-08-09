// ==========================================
// Type Definitions for ppipe
// ==========================================

// Branded placeholder type using unique symbol
// Export the symbol so it can be used in placeholder.ts
export const PlaceholderBrand: unique symbol = Symbol("ppipe.placeholder");
export type PlaceholderType = { readonly [PlaceholderBrand]: true };

// Async state tracking - determines if a type is a Promise. Three-state by design:
//   Promise<X>                -> true
//   a non-promise             -> false
//   a mix, or `any`           -> boolean
// The distributive second half is deliberate. For `number | Promise<number>` the
// compiler genuinely cannot tell, and `boolean` is the honest answer: PipeValue
// distributes it back to `number | Promise<number>`, so callers must handle both.
// Collapsing that to `false` would type `.value` as `number` while the runtime
// hands back a Promise.
// The `never` guard is only there because a naked `T extends ...` distributes over
// the empty union and yields `never` rather than a boolean.
export type IsAsync<T> = [T] extends [never] ? false : T extends Promise<unknown> ? true : false;

// Extensions base type - a record with string keys
// The actual function types are preserved through the generic parameter E
// This avoids 'any' by not constraining the function signatures at the base level
export type Extensions = Record<string, unknown>;

// Helper to combine async states (true if either is true)
export type CombineAsync<A extends boolean, B extends boolean> = A extends true ? true : B extends true ? true : false;

// Resolves the type of `.value` / `.val` from the tracked Async flag:
// Promise<T> for async pipes, plain T for sync pipes.
// If Async is `boolean` (an input the compiler cannot classify), this
// distributes to `T | Promise<T>` - the honest answer for that case.
export type PipeValue<T, Async extends boolean> = Async extends true ? Promise<Awaited<T>> : Awaited<T>;

// Reported when the arguments passed to `.pipe()` do not match the piped
// function's parameters. Surfaces as a named type in the error message
// instead of a bare `never`.
declare const ArityErrorBrand: unique symbol;
export type ArityMismatch<Message extends string> = { readonly [ArityErrorBrand]: Message };

// Helper: Only matches if function has exactly N parameters (or is variadic)
// This prevents functions with fewer parameters from matching overloads expecting more
type ExactArityFn<Fn, N extends number> = Fn extends (...args: infer P) => unknown
	? P["length"] extends N
		? Fn
		: number extends P["length"] // Allow variadic functions (rest params)
			? Fn
			: never
	: never;

// ==========================================
// Variadic Fallback Types (for 5+ args)
// ==========================================

// Check if tuple contains any placeholders
type HasPlaceholder<Args extends unknown[]> = Args extends [infer H, ...infer T]
	? H extends PlaceholderType
		? true
		: HasPlaceholder<T>
	: false;

// Replace all placeholders with T, preserving tuple structure
type ReplacePlaceholders<Args extends unknown[], T> = {
	[K in keyof Args]: Args[K] extends PlaceholderType ? T : Args[K];
};

// Final args: replace placeholders if any exist, otherwise append T at end
type FinalArgs<Args extends unknown[], T> =
	HasPlaceholder<Args> extends true ? ReplacePlaceholders<Args, T> : [...Args, T];

// Variadic pipe result: validates args against function parameters.
// Returns PipeWithExtensions if valid, an ArityMismatch marker if not. Member
// access on that marker fails, which is where the error surfaces.
export type VariadicPipeResult<
	Fn extends (...args: never[]) => unknown,
	Args extends unknown[],
	T,
	E extends Extensions,
	Async extends boolean,
> =
	FinalArgs<Args, Awaited<T>> extends Parameters<Fn>
		? PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>
		: ArityMismatch<"the arguments passed to .pipe() do not match the piped function's parameters">;

// ==========================================
// Pipe Interface with Placeholder Overloads
// ==========================================

export interface Pipe<T, E extends Extensions = Record<string, never>, Async extends boolean = false> {
	// Basic pipe - value as only argument (no placeholder needed)
	pipe<R>(fn: (value: Awaited<T>) => R): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 1 argument
	// IMPORTANT: Placeholder overloads MUST come before no-placeholder overloads
	// because PlaceholderType is more specific than generic A
	// ==========================================

	// 1 arg with placeholder in position 0
	pipe<R>(
		fn: (a: Awaited<T>) => R,
		a: PlaceholderType
	): PipeWithExtensions<Awaited<R>, E, CombineAsync<Async, IsAsync<R>>>;

	// ==========================================
	// Placeholder overloads for 2 arguments
	// ==========================================

	// 2 args - placeholder at position 0
	pipe<Fn extends (a: Awaited<T>, b: B) => unknown, B>(
		fn: ExactArityFn<Fn, 2>,
		a: PlaceholderType,
		b: B
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 2 args - placeholder at position 1
	pipe<Fn extends (a: A, b: Awaited<T>) => unknown, A>(
		fn: ExactArityFn<Fn, 2>,
		a: A,
		b: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 2 args - placeholders at both positions
	pipe<Fn extends (a: Awaited<T>, b: Awaited<T>) => unknown>(
		fn: ExactArityFn<Fn, 2>,
		a: PlaceholderType,
		b: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// ==========================================
	// Placeholder overloads for 3 arguments
	// ==========================================

	// 3 args - placeholder at position 0
	pipe<Fn extends (a: Awaited<T>, b: B, c: C) => unknown, B, C>(
		fn: ExactArityFn<Fn, 3>,
		a: PlaceholderType,
		b: B,
		c: C
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholder at position 1
	pipe<Fn extends (a: A, b: Awaited<T>, c: C) => unknown, A, C>(
		fn: ExactArityFn<Fn, 3>,
		a: A,
		b: PlaceholderType,
		c: C
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholder at position 2
	pipe<Fn extends (a: A, b: B, c: Awaited<T>) => unknown, A, B>(
		fn: ExactArityFn<Fn, 3>,
		a: A,
		b: B,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholders at positions 0, 1
	pipe<Fn extends (a: Awaited<T>, b: Awaited<T>, c: C) => unknown, C>(
		fn: ExactArityFn<Fn, 3>,
		a: PlaceholderType,
		b: PlaceholderType,
		c: C
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholders at positions 0, 2
	pipe<Fn extends (a: Awaited<T>, b: B, c: Awaited<T>) => unknown, B>(
		fn: ExactArityFn<Fn, 3>,
		a: PlaceholderType,
		b: B,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholders at positions 1, 2
	pipe<Fn extends (a: A, b: Awaited<T>, c: Awaited<T>) => unknown, A>(
		fn: ExactArityFn<Fn, 3>,
		a: A,
		b: PlaceholderType,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - placeholders at all positions
	pipe<Fn extends (a: Awaited<T>, b: Awaited<T>, c: Awaited<T>) => unknown>(
		fn: ExactArityFn<Fn, 3>,
		a: PlaceholderType,
		b: PlaceholderType,
		c: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// ==========================================
	// Placeholder overloads for 4 arguments
	// ==========================================

	// 4 args - placeholder at position 0 only
	pipe<Fn extends (a: Awaited<T>, b: B, c: C, d: D) => unknown, B, C, D>(
		fn: ExactArityFn<Fn, 4>,
		a: PlaceholderType,
		b: B,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - placeholder at position 1 only
	pipe<Fn extends (a: A, b: Awaited<T>, c: C, d: D) => unknown, A, C, D>(
		fn: ExactArityFn<Fn, 4>,
		a: A,
		b: PlaceholderType,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - placeholder at position 2 only
	pipe<Fn extends (a: A, b: B, c: Awaited<T>, d: D) => unknown, A, B, D>(
		fn: ExactArityFn<Fn, 4>,
		a: A,
		b: B,
		c: PlaceholderType,
		d: D
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - placeholder at position 3 only
	pipe<Fn extends (a: A, b: B, c: C, d: Awaited<T>) => unknown, A, B, C>(
		fn: ExactArityFn<Fn, 4>,
		a: A,
		b: B,
		c: C,
		d: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - multiple placeholder combinations (most common ones)
	pipe<Fn extends (a: Awaited<T>, b: Awaited<T>, c: C, d: D) => unknown, C, D>(
		fn: ExactArityFn<Fn, 4>,
		a: PlaceholderType,
		b: PlaceholderType,
		c: C,
		d: D
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	pipe<Fn extends (a: Awaited<T>, b: B, c: Awaited<T>, d: D) => unknown, B, D>(
		fn: ExactArityFn<Fn, 4>,
		a: PlaceholderType,
		b: B,
		c: PlaceholderType,
		d: D
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - all placeholders
	pipe<Fn extends (a: Awaited<T>, b: Awaited<T>, c: Awaited<T>, d: Awaited<T>) => unknown>(
		fn: ExactArityFn<Fn, 4>,
		a: PlaceholderType,
		b: PlaceholderType,
		c: PlaceholderType,
		d: PlaceholderType
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// ==========================================
	// No placeholder overloads (value appended at end)
	// These come AFTER placeholder overloads to ensure placeholder matching takes priority
	// ==========================================

	// 2 args - no placeholder, value goes at position 1
	pipe<Fn extends (a: A, value: Awaited<T>) => unknown, A>(
		fn: ExactArityFn<Fn, 2>,
		a: A
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 3 args - no placeholder, value goes at position 2
	pipe<Fn extends (a: A, b: B, value: Awaited<T>) => unknown, A, B>(
		fn: ExactArityFn<Fn, 3>,
		a: A,
		b: B
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// 4 args - no placeholder, value goes at position 3
	pipe<Fn extends (a: A, b: B, c: C, value: Awaited<T>) => unknown, A, B, C>(
		fn: ExactArityFn<Fn, 4>,
		a: A,
		b: B,
		c: C
	): PipeWithExtensions<Awaited<ReturnType<Fn>>, E, CombineAsync<Async, IsAsync<ReturnType<Fn>>>>;

	// ==========================================
	// Variadic fallback for 5+ arguments
	// ==========================================
	// NOTE: This fallback does NOT provide contextual typing for lambda parameters.
	// For 5+ args, use named functions or explicitly typed lambdas:
	//   ✓ pipe(myFunction, _, arg2, arg3, arg4, arg5)
	//   ✓ pipe((a: number, b: string, ...) => result, _, arg2, ...)
	//   ✗ pipe((a, b, c, d, e) => result, _, ...)  // 'a' will be 'never'

	pipe<Fn extends (...args: never[]) => unknown, Args extends unknown[]>(
		fn: Fn,
		...args: Args
	): VariadicPipeResult<Fn, Args, T, E, Async>;

	// ==========================================
	// Value extraction
	// ==========================================

	// Returns T for sync pipes, Promise<T> for async pipes, driven by the
	// tracked Async flag - so no narrowing or cast is needed at the call site.
	readonly value: PipeValue<T, Async>;

	// Legacy alias for value
	readonly val: PipeValue<T, Async>;

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

// Helper to detect generic identity functions
// For generic functions like <T>(value: T) => T, TypeScript infers both V and R as `unknown`
// For concrete functions like (value: number) => number, V and R are `number`
// `unknown extends X` is true only when X is `unknown` (or `any`)
export type IsGenericIdentity<V, R> = unknown extends V ? (unknown extends R ? true : false) : false;

// Determines the result type for extension methods
// Preserves pipe's T for generic identity functions, otherwise uses the function's return type R
export type ExtensionResultType<PipeT, V, R> = IsGenericIdentity<V, R> extends true ? PipeT : R;

// Maps extension functions to pipe methods
// Each extension fn(value, ...args) becomes pipe.fn(...args)
// Returns PipeWithExtensions to preserve extension methods through the chain
// Only maps keys where the value is a function
// For generic identity functions (where V and R are both unknown), preserves the pipe's type T
//
// The `Awaited<T> extends V` guard keeps an extension off pipes it cannot accept:
// an extension taking a string is not offered on a pipe holding a number. Generic
// pass-through extensions infer V as `unknown`, so they remain available everywhere.
export type ExtensionMethods<T, E extends Extensions, Async extends boolean> = {
	[K in keyof E as E[K] extends (...args: infer _Args) => unknown ? K : never]: E[K] extends (
		value: infer V,
		...args: infer A
	) => infer R
		? Awaited<T> extends V
			? (
					...args: A
				) => PipeWithExtensions<
					Awaited<ExtensionResultType<T, V, R>>,
					E,
					CombineAsync<Async, IsAsync<ExtensionResultType<T, V, R>>>
				>
			: never
		: never;
};

// ==========================================
// Factory interface
// ==========================================

// Merging extensions mirrors the runtime spread: keys in NewE replace keys of
// the same name in E, rather than intersecting with them.
export type MergeExtensions<E extends Extensions, NewE extends Extensions> = Omit<E, keyof NewE> & NewE;

export interface PipeFactory<E extends Extensions = Record<string, never>> {
	<T>(value: T): PipeWithExtensions<T, E, IsAsync<T>>;
	readonly _: PlaceholderType;
	extend<NewE extends Extensions>(ext: NewE): PipeFactory<MergeExtensions<E, NewE>>;
}
