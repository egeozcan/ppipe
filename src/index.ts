// ==========================================
// ppipe - Strictly-Typed Piping Library
// ==========================================

import type { Extensions, PipeFactory, PipeWithExtensions, IsAsync, MergeExtensions } from "./types.js";
import { _ } from "./placeholder.js";
import { createPipe } from "./pipe.js";

// Re-export types for consumers
export type {
	ArityMismatch,
	Extensions,
	MergeExtensions,
	Pipe,
	PipeFactory,
	PipeValue,
	PipeWithExtensions,
	PlaceholderType,
} from "./types.js";
export { isPlaceholder } from "./placeholder.js";

// ==========================================
// Factory Creation
// ==========================================

function createPpipe<E extends Extensions>(extensions: E): PipeFactory<E> {
	// The main factory function
	function ppipeFunc<T>(value: T): PipeWithExtensions<T, E, IsAsync<T>> {
		return createPipe(value, extensions);
	}

	// Create the extend function. The explicit annotation on `merged` states the
	// override semantics the spread already has at runtime, so no assertion is needed.
	const extendFunc = <NewE extends Extensions>(newExtensions: NewE): PipeFactory<MergeExtensions<E, NewE>> => {
		const merged: MergeExtensions<E, NewE> = { ...extensions, ...newExtensions };

		return createPpipe(merged);
	};

	// Combine function with properties using Object.assign
	// This returns the correct intersection type
	const factory = Object.assign(ppipeFunc, {
		_: _,
		extend: extendFunc,
	});

	return factory;
}

// ==========================================
// Default Export
// ==========================================

// Create the default ppipe instance with no extensions
const ppipe = createPpipe({});

// Export the placeholder for convenient destructuring
export { _ };

// Default export for CommonJS compatibility
export default ppipe;
