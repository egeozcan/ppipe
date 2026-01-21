# [![PPIPE](logo/logo_s.png)](https://github.com/egeozcan/ppipe)

[![build](https://travis-ci.org/egeozcan/ppipe.svg?branch=master)](https://travis-ci.org/egeozcan/ppipe)
[![Coverage Status](https://coveralls.io/repos/github/egeozcan/ppipe/badge.svg?branch=master)](https://coveralls.io/github/egeozcan/ppipe?branch=master)
[![npm](https://img.shields.io/npm/v/ppipe.svg)](https://www.npmjs.com/package/ppipe)
[![npm](https://img.shields.io/npm/dt/ppipe.svg)](https://www.npmjs.com/package/ppipe)
[![license](https://img.shields.io/github/license/egeozcan/ppipe.svg)](https://github.com/egeozcan/ppipe/blob/master/LICENSE)

**Strictly-typed pipes for values through functions**, an alternative to using the
[proposed pipe operator](https://github.com/tc39/proposal-pipeline-operator) ( |> ) for ES.

Version 3.0 is a complete TypeScript rewrite with **maximum type safety** - no `any` in the public API, full IDE autocomplete support, and correct type inference throughout the chain.

## Installation

```bash
npm install ppipe
```

## Quick Start

```typescript
import ppipe, { _ } from 'ppipe';

const add = (x: number, y: number) => x + y;
const square = (x: number) => x * x;
const divide = (x: number, y: number) => x / y;
const double = (x: number) => x * 2;

// Basic piping
const result = ppipe(1)
  .pipe(add, _, 1)      // 2
  .pipe(double)         // 4
  .pipe(square)         // 16
  .pipe(divide, _, 8)   // 2
  .pipe(add, _, 1)      // 3
  .value;

console.log(result); // 3
```

## Features

### Basic Piping

Chain functions together, passing the result of each to the next:

```typescript
ppipe('hello')
  .pipe(s => s.toUpperCase())
  .pipe(s => s + '!')
  .value; // 'HELLO!'
```

### Placeholder Positioning

Use `_` to control where the piped value is inserted:

```typescript
const _ = ppipe._;

// Value inserted at placeholder position
ppipe(10)
  .pipe(divide, _, 2)   // divide(10, 2) = 5
  .value;

// Without placeholder, value is appended at the end
ppipe(10)
  .pipe(divide, 100)    // divide(100, 10) = 10
  .value;

// Multiple placeholders insert the same value multiple times
ppipe(5)
  .pipe((a, b) => a + b, _, _)  // 5 + 5 = 10
  .value;
```

### Async/Promise Support

Promises are automatically handled - the chain waits for resolution and passes the unwrapped value to the next function:

```typescript
async function fetchUser(id: number) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const userName = await ppipe(1)
  .pipe(fetchUser)
  .pipe(user => user.name)
  .pipe(name => name.toUpperCase());

// Or use .then()/.catch()
ppipe(1)
  .pipe(fetchUser)
  .pipe(user => user.name)
  .then(name => console.log(name))
  .catch(err => console.error(err));
```

### Value Extraction

Get the current value with `.value` (or `.val`):

```typescript
// Sync value
const num = ppipe(5).pipe(x => x * 2).value; // 10

// Async value (returns Promise)
const asyncNum = await ppipe(Promise.resolve(5)).pipe(x => x * 2).value;
```

### Typed Extensions

Create reusable pipe extensions with full type inference:

```typescript
const mathPipe = ppipe.extend({
  double: (x: number) => x * 2,
  square: (x: number) => x * x,
  add: (x: number, y: number) => x + y,
});

const result = mathPipe(5)
  .double()      // 10 - return type inferred as number
  .square()      // 100
  .add(5)        // 105
  .value;

// Extensions can be chained
const extendedPipe = mathPipe.extend({
  stringify: (x: number) => String(x),
});

const str = extendedPipe(5)
  .double()
  .stringify()   // '10' - return type inferred as string
  .value;
```

### Generic Pass-Through Extensions

Generic identity functions like `log` or `tap` preserve the pipe's type automatically:

```typescript
const pp = ppipe.extend({
  log: <T>(value: T, label?: string): T => {
    console.log(label ?? 'value:', value);
    return value;
  },
});

// Type is preserved through .log() - no type loss!
pp(8)
  .log('start')     // logs: "start: 8"
  .pipe(x => x + 3) // x is number, not unknown
  .log('end')       // logs: "end: 11"
  .value;           // 11

pp('hello')
  .log()
  .pipe(s => s.toUpperCase()) // s is string
  .value;                      // 'HELLO'
```

## API Reference

### `ppipe(value)`

Creates a new pipe with the given initial value.

```typescript
const pipe = ppipe(initialValue);
```

### `.pipe(fn, ...args)`

Pipes the current value through a function. The value is inserted at the placeholder position, or appended at the end if no placeholder is used.

```typescript
pipe.pipe(fn)              // fn(value)
pipe.pipe(fn, _, arg2)     // fn(value, arg2)
pipe.pipe(fn, arg1)        // fn(arg1, value)
pipe.pipe(fn, arg1, _)     // fn(arg1, value)
```

### `.value` / `.val`

Gets the current value from the chain. Returns a Promise if any function in the chain was async.

### `.then(onFulfilled?, onRejected?)`

Standard Promise `then` interface. Always available for consistent async handling.

### `.catch(onRejected?)`

Standard Promise `catch` interface. Always available for consistent async handling.

### `ppipe._`

The placeholder symbol for argument positioning.

### `ppipe.extend(extensions)`

Creates a new ppipe factory with additional methods:

```typescript
const extended = ppipe.extend({
  methodName: (value, ...args) => result,
});
```

Extension functions receive the piped value as their first argument.

## Migration from v2.x

Version 3.0 is a TypeScript rewrite that prioritizes type safety. Some dynamic features that couldn't be strictly typed have been removed:

### Removed Features

| Feature | v2.x | v3.x Alternative |
|---------|------|------------------|
| Deep property access | `_.a.b.c` | `.pipe(x => x.a.b.c)` |
| Array spreading | `..._` | `.pipe(arr => fn(...arr))` |
| Direct method access | `.map(fn)` | `.pipe(arr => arr.map(fn))` |
| Context binding | `.with(ctx)` | `.pipe(fn.bind(ctx))` |
| Callable syntax | `ppipe(val)(fn)` | `ppipe(val).pipe(fn)` |

### Why These Changes?

These features relied on Proxy magic that returned `any` types, breaking TypeScript's ability to infer types correctly. The v3.x API ensures:

- Full IDE autocomplete support
- Correct type inference throughout the chain
- No `any` types in the public API
- Compile-time error detection

## Type Safety

ppipe v3.x provides complete type inference:

```typescript
// Types are inferred correctly through the chain
const result = ppipe(5)
  .pipe(x => x * 2)           // Pipe<number>
  .pipe(x => x.toString())    // Pipe<string>
  .pipe(x => x.length)        // Pipe<number>
  .value;                     // number

// Async types are tracked
const asyncResult = ppipe(Promise.resolve(5))
  .pipe(x => x * 2)           // Pipe<number, async=true>
  .value;                     // Promise<number>

// Extension return types are inferred
const myPipe = ppipe.extend({
  toArray: <T>(x: T) => [x],
});

myPipe(5).toArray().value;    // number[]

// Generic identity extensions preserve the pipe's type
const debugPipe = ppipe.extend({
  log: <T>(value: T): T => { console.log(value); return value; },
});

debugPipe(5).log().pipe(x => x * 2).value;  // x is number, result is number
```

## Testing

100% test coverage is maintained. To run tests:

```bash
npm install
npm test
```

## Contributing

See [CONTRIBUTING](https://github.com/egeozcan/ppipe/blob/master/.github/CONTRIBUTING.md).

## Changelog

### v3.0.0

- Complete TypeScript rewrite with strict typing
- Full IDE autocomplete and type inference support
- Generic pass-through extensions preserve pipe type (e.g., `log`, `tap`)
- Removed features that couldn't be strictly typed (see Migration section)
- 100% test coverage on source files
- Strict ESLint rules disable all TypeScript escape hatches:
  - No `any` types
  - No type assertions (`as`)
  - No ts-ignore/ts-expect-error comments
  - No non-null assertions (`!`)
- Discriminated union state management for type-safe async/sync/error handling
- Updated all dependencies to latest versions

### v2.x

See [v2.x README](https://github.com/egeozcan/ppipe/tree/v2.6.5) for previous features.

## License

ISC
