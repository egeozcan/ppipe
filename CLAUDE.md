# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build      # Compile TypeScript (outputs to dist/)
npm test           # Build + run tests with coverage
npm run typecheck  # Type-check without emitting
npm run lint       # ESLint with auto-fix
```

Tests use Mocha + Chai. Run a single test file: `npm run build && mocha test/test.js --grep "pattern"`.

`npm test` runs `typecheck:types` first — the type-level suite in `test/types.test.ts`. That file
produces no runtime output; it passes if and only if it compiles. Add a case there for any change
to the public types.

```bash
npm run typecheck:types   # type-level assertions only (test/types.test.ts)
```

## Architecture

**ppipe** is a strictly-typed function piping library (~300 lines). TypeScript v3.0 rewrite prioritizes type safety over runtime flexibility.

### Source Files (src/)

- **index.ts** - Entry point. Creates default `ppipe` factory via `createPpipe()`, exports placeholder `_`
- **pipe.ts** - Core implementation. `PipeImpl` class with discriminated union state:
  - `pipe(fn, ...args)` - chains functions, replaces `_` placeholders with current value
  - `value`/`val` - extracts result (sync or Promise)
  - `then()`/`catch()` - Promise interface
  - Extension methods added dynamically via `Object.assign`
- **types.ts** - Type definitions. Heavy use of conditional types (`IsAsync`, `CombineAsync`, `PipeValue`) and function overloads (40+ for placeholder positioning). Exports `PlaceholderBrand` symbol
- **placeholder.ts** - Branded `_` singleton using Symbol for type-safe argument positioning

### Key Design Patterns

1. **Discriminated Union State**: Pipe state uses `{ kind: "sync" | "async" | "error", ... }` for type-safe state management without assertions

2. **Settled Promise Pattern**: Async values are wrapped in `{ resolved: true, value }` or `{ resolved: false, error }` to prevent unhandled rejections while maintaining error propagation

3. **Type Predicates**: Functions like `isThenable()`, `hasProperty()`, and `isCallableFunction()` enable safe type narrowing without assertions

4. **Object.assign Extensions**: `ppipe.extend({...})` creates new factory; extension methods are built via `Object.assign` with type inference through `ExtensionMethods<T, E, Async>`

5. **Placeholder Detection**: `isPlaceholder()` checks Symbol brand. Without placeholder, value appends at end; with placeholder(s), value replaces each `_` position

### Type System

The `Pipe<T, E, Async>` interface tracks:
- `T` - current value type
- `E` - extension functions record (`Record<string, unknown>`)
- `Async` - boolean flag, propagated via `CombineAsync` when any function returns Promise

**`Async` must stay load-bearing.** `.value` / `.val` are typed `PipeValue<T, Async>`, which
resolves to `Awaited<T>` for sync chains and `Promise<Awaited<T>>` for async ones. Before this,
`Async` was computed but never consumed and `.value` was always `T | Promise<T>`, forcing a cast
at every call site. Any change that reverts `.value` to a union defeats the whole `Async` machinery.

**`IsAsync` is deliberately three-state**: `true` for a Promise, `false` for a non-promise, and
`boolean` for a union of both (or for `any`). The distribution in `T extends Promise<unknown>` is
load-bearing — `boolean` is the *honest* answer when the compiler cannot tell, because `PipeValue`
distributes it back into `T | Promise<T>` and forces the caller to handle both.

Do not "simplify" it to a fully non-distributive `[T] extends [Promise<unknown>]`. That collapses
the mixed case to `false`, typing `.value` as `T` while the runtime returns a Promise — the exact
compile-clean/crash-at-runtime class of bug this release set out to remove. It also gets the corners
backwards: `[never] extends [Promise<unknown>]` is `true` (never is assignable to everything), and
`any` would report `true` rather than `boolean`. The `[T] extends [never]` guard at the front exists
only because a naked conditional distributes over the empty union and returns `never` instead of a
boolean. `test/types.test.ts` pins all of these.

### Extension Type Rules

Three invariants in `ExtensionMethods<T, E, Async>`, each with cases in `test/types.test.ts`:

1. **Value-type guard** - `Awaited<T> extends V` gates each method, where `V` is the extension's
   first parameter. An extension declaring `(v: string)` is not offered on a pipe holding a number.
   Without this, `ppipe.extend({ upper: (v: string) => v.toUpperCase() })(42).upper()` type-checked
   and threw at runtime.
2. **Generic pass-through** - `IsGenericIdentity<V, R>` preserves the pipe's `T` for `<G>(v: G) => G`
   style extensions. Those infer `V` as `unknown`, so the guard above admits them everywhere.
3. **Override semantics** - `extend()` returns `MergeExtensions<E, NewE>` (`Omit<E, keyof NewE> & NewE`),
   mirroring the runtime spread where later keys replace earlier ones. A plain `E & NewE` intersection
   produces an overload set whose resolution does not match runtime behaviour.

`ExtensionMethodImpl` in `pipe.ts` intentionally omits the value-type guard: it types the
implementation, which builds a method for every extension unconditionally. The public
`ExtensionMethods` type is what gates access.

### ESLint Strict Mode

All TypeScript escape hatches are disabled via ESLint:
- `@typescript-eslint/no-explicit-any` - no `any` types
- `@typescript-eslint/ban-ts-comment` - no ts-ignore/ts-expect-error
- `@typescript-eslint/no-non-null-assertion` - no `!` assertions
- `@typescript-eslint/consistent-type-assertions` - no `as` assertions

4 boundary assertions remain at type-system interfaces (with eslint-disable comments):
- `createExtensionMethod` return type
- `createPipeWithExtensions` return type
- `createPipe` async/sync branch returns

**IMPORTANT: Never add any new type assertions, `any` types, ts-ignore comments, or other TypeScript escape hatches. The 4 existing boundary assertions are the maximum allowed. If new code cannot be written without escape hatches, restructure the approach using type predicates, discriminated unions, or function overloads instead.**

### Arity Checking System

The type system enforces that functions receive the correct number of arguments. This prevents silent bugs where extra arguments are passed to functions that don't expect them.

**How it works:**

1. **`ExactArityFn<Fn, N>` helper type** - Only matches functions with exactly N parameters (or variadic functions). When a function has wrong arity, the type becomes `never` and the overload doesn't match.

2. **Explicit overloads (1-4 args)** - Each overload uses `ExactArityFn<Fn, N>` to ensure the function's parameter count matches the number of arguments passed.

3. **Variadic fallback (5+ args)** - Uses `VariadicPipeResult` which checks `FinalArgs<Args, T> extends Parameters<Fn>`. Returns `ArityMismatch<Message>` on mismatch.

`ExactArityFn` must keep returning `never` — that is what makes a non-matching overload drop out of
resolution so the call falls through to the variadic fallback. Only `VariadicPipeResult`'s failure
branch carries the `ArityMismatch` marker, which exists purely to put a readable name in the error.

**Example of caught error:**
```typescript
const subtract = (a: number, b: number) => a - b;  // 2 params

// This line COMPILES. The call itself is not rejected - it evaluates to an
// ArityMismatch marker, and the error only appears when something is read off it.
const bad = ppipe(8).pipe(subtract, _, 3, 5, 10);

bad.value;  // Property 'value' does not exist on type
            // 'ArityMismatch<"the arguments passed to .pipe() do not match
            //  the piped function's parameters">'
```
A chain that never reads a member — a bare `.pipe(...)` statement — is therefore not
flagged at all. Erroring at the call site would require the overload itself to fail
to resolve, which would cost the contextual typing that makes untyped lambdas work.

**Design tradeoffs:**
- Error appears on member access, not at the `.pipe()` call site (TypeScript limitation)
- Untyped lambdas work for 1-4 args due to contextual typing from `Awaited<T>` in placeholder positions
- 5+ args require typed functions/lambdas because variadic fallback can't provide contextual typing
- Variadic functions (`...rest` params) are allowed through the arity check
- Overloaded functions resolve against their **last** overload only, since `Parameters`/`ReturnType`
  see no other. Not fixable in this design; documented in README with a lambda-wrapping workaround
  and pinned in `test/types.test.ts`
- **Zero-parameter functions are deliberately accepted.** `.pipe(fn)` always calls `fn` with the
  current value, but `() => x` is assignable to `(value: T) => x` under normal TS rules. The runtime
  suite depends on this for side-effecting and rejecting helpers — do not "fix" it with an arity guard
  on the 1-arg overload
