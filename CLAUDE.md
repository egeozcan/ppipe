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

## Architecture

**ppipe** is a strictly-typed function piping library (~300 lines). TypeScript v3.0 rewrite prioritizes type safety over runtime flexibility.

### Source Files (src/)

- **index.ts** - Entry point. Creates default `ppipe` factory via `createPpipe()`, exports placeholder `_`
- **pipe.ts** - Core implementation. `PipeImpl` class with discriminated union state:
  - `pipe(fn, ...args)` - chains functions, replaces `_` placeholders with current value
  - `value`/`val` - extracts result (sync or Promise)
  - `then()`/`catch()` - Promise interface
  - Extension methods added dynamically via `Object.assign`
- **types.ts** - Type definitions. Heavy use of conditional types (`IsAsync`, `CombineAsync`) and function overloads (40+ for placeholder positioning). Exports `PlaceholderBrand` symbol
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

3. **Variadic fallback (5+ args)** - Uses `VariadicPipeResult` which checks `FinalArgs<Args, T> extends Parameters<Fn>`. Returns `never` on mismatch.

**Example of caught error:**
```typescript
const subtract = (a: number, b: number) => a - b;  // 2 params
ppipe(8).pipe(subtract, _, 3, 5, 10);  // 4 args - type error!
// Result is 'never', accessing .value produces: "Property 'value' does not exist on type 'never'"
```

**Design tradeoffs:**
- Error appears when accessing `.value`, not at the `.pipe()` call site (TypeScript limitation)
- Untyped lambdas work for 1-4 args due to contextual typing from `Awaited<T>` in placeholder positions
- 5+ args require typed functions/lambdas because variadic fallback can't provide contextual typing
- Variadic functions (`...rest` params) are allowed through the arity check
