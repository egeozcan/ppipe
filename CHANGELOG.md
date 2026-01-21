# Changelog

All notable changes to this project will be documented in this file.

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
