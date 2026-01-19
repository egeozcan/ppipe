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
