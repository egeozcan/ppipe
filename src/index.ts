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
	function ppipe<T>(value: T): PipeWithExtensions<T, E, IsAsync<T>> {
		return createPipe(value, extensions);
	}

	// Attach the placeholder
	Object.defineProperty(ppipe, "_", {
		value: _,
		writable: false,
		enumerable: true,
		configurable: false,
	});

	// Attach extend method
	Object.defineProperty(ppipe, "extend", {
		value: <NewE extends Extensions>(newExtensions: NewE): PipeFactory<E & NewE> =>
			createPpipe({ ...extensions, ...newExtensions }),
		writable: false,
		enumerable: true,
		configurable: false,
	});

	return ppipe as PipeFactory<E>;
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
