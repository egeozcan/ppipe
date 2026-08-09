# Changelog

All notable changes to this project will be documented in this file.

## [4.0.0] - 2026-08-09

Type-level release. No runtime behaviour changes — all 55 runtime tests pass unmodified at 100%
coverage. Several types became stricter, so this is a major bump.

### Fixed

- **Extensions are no longer offered on pipes they cannot accept.** `ExtensionMethods` inferred the
  extension's first parameter but never checked it against the pipe's value type, so every extension
  appeared on every pipe. `ppipe.extend({ upper: (v: string) => v.toUpperCase() })(42).upper()`
  type-checked cleanly and threw `v.toUpperCase is not a function` at runtime. Now guarded by
  `Awaited<T> extends V`. Generic pass-through extensions (`<G>(v: G) => G`) are unaffected
- **`.value` / `.val` resolve to an exact type.** They were always `T | Promise<T>`, so the correctly
  tracked `Async` flag never reached callers and every call site needed a cast. Now typed
  `PipeValue<T, Async>` — `T` for sync chains, `Promise<T>` for async ones
- **`extend()` now overrides same-named extensions** instead of intersecting them. The type was
  `E & NewE` while the runtime spread replaced the key; now `MergeExtensions<E, NewE>`
- **`IsAsync` no longer distributes over unions.** `IsAsync<number | Promise<number>>` collapsed to
  `boolean` and `IsAsync<never>` to `never`. Now `[T] extends [Promise<unknown>]`
- **`ppipe(promise).value`** no longer resolves to the uninhabitable
  `Promise<T> | Promise<Promise<T>>`
- **Fixed a typo in the 4-argument `{0,2}` placeholder overload**, where `b` and `d` were forced to
  share one type parameter. The overload was dead — such calls silently fell through to the variadic
  fallback

### Changed

- Arity mismatches now produce `ArityMismatch<Message>` instead of a bare `never`, so the error reads
  `Property 'value' does not exist on type 'ArityMismatch<"the arguments passed to .pipe() do not
  match the piped function's parameters">'`. The error still surfaces on member access, not at the
  `.pipe()` call
- `typecheck:arity` renamed to `typecheck:types` and now runs as part of `npm test` — the type-level
  suite previously ran only when invoked by hand
- `test/types.test.ts` rewritten around `Expect<Equals<A, B>>` assertions. The previous version used
  `as` casts (`const t1Check: number = t1.value as number`), which asserted nothing; it would have
  passed even if `.value` were `any`. Now covers exact result types, async propagation, extension
  guards, override semantics, and the documented overload limitation

### Added

- Exported types `PipeValue`, `MergeExtensions`, `ArityMismatch`
- `tsconfig.types-test.json` so the type-level suite inherits the project's full strictness

### Removed

- `IsFunction<T>` — exported but never used

### Documentation

- README: exact `.value` typing, extension value-type checking, `extend()` override semantics, and a
  new limitations section covering overloaded functions (with a lambda-wrapping workaround) and the
  deliberate acceptance of zero-parameter functions
- CLAUDE.md: extension type rules, why `Async` must stay load-bearing, why `IsAsync` needs the tuple
  wrapper, and why `ExactArityFn` must keep returning `never`

### Notes

- No new type assertions, `any` types, or `ts-ignore` comments. The count of boundary assertions
  remains exactly 4, as required by CLAUDE.md

## [3.2.0] - 2025-01-23

### Added

- **Arity checking**: Functions now receive compile-time errors when passed extra arguments
  - `ppipe(8).pipe(subtract, _, 3, 5, 10)` now errors if `subtract` only takes 2 params
  - Uses `ExactArityFn<Fn, N>` helper type to enforce exact parameter count
  - Variadic functions (rest params) are allowed through the check
- Type-level test file (`test/types.test.ts`) with `@ts-expect-error` validation
- New npm script `typecheck:arity` for running type-level tests

### Changed

- Placeholder overloads now use `Awaited<T>` for contextual typing of lambda parameters
- Overloads use `ReturnType<Fn>` instead of generic `R` for better type extraction

### Documentation

- Updated CLAUDE.md with arity checking system design
- Updated README.md with type safety strengths and limitations

## [3.1.0] - 2025-01-21

### Added

- Generic pass-through extensions now preserve the pipe's type
  - Extensions like `<T>(value: T) => T` correctly maintain type through the chain
  - Enables type-safe `log()`, `tap()`, and similar utility extensions

## [3.0.0] - 2025-01-01

### Added

- Complete TypeScript rewrite with strict typing
- Full IDE autocomplete and type inference support
- Discriminated union state management for type-safe async/sync/error handling
- 100% test coverage on source files
- Strict ESLint rules disable all TypeScript escape hatches:
  - No `any` types
  - No type assertions (`as`)
  - No ts-ignore/ts-expect-error comments
  - No non-null assertions (`!`)

### Removed

- Features that couldn't be strictly typed (see Migration section in README):
  - Deep property access (`_.a.b.c`)
  - Array spreading (`..._`)
  - Direct method access (`.map(fn)`)
  - Context binding (`.with(ctx)`)
  - Callable syntax (`ppipe(val)(fn)`)

### Changed

- Updated all dependencies to latest versions

## [2.x]

See [v2.x README](https://github.com/egeozcan/ppipe/tree/v2.6.5) for previous features.
