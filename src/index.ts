// ==========================================
// ppipe - Strictly-Typed Piping Library
// ==========================================

import type { Extensions, PipeFactory, PipeWithExtensions, IsAsync } from "./types";
import { _ } from "./placeholder";
import { createPipe } from "./pipe";

// Re-export types for consumers
export type { Extensions, Pipe, PipeFactory, PipeWithExtensions, PlaceholderType } from "./types";
export { isPlaceholder } from "./placeholder";

// ==========================================
// Factory Creation
// ==========================================

function createPpipe<E extends Extensions>(extensions: E): PipeFactory<E> {
	// The main factory function
	function ppipeFunc<T>(value: T): PipeWithExtensions<T, E, IsAsync<T>> {
		return createPipe(value, extensions);
	}

	// Create the extend function
	const extendFunc = <NewE extends Extensions>(newExtensions: NewE): PipeFactory<E & NewE> =>
		createPpipe({ ...extensions, ...newExtensions });

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
