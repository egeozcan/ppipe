// ==========================================
// Placeholder Implementation
// ==========================================

import type { PlaceholderType } from "./types";

// Brand symbol for type safety
const PlaceholderBrand = Symbol("ppipe.placeholder");

// Internal placeholder class
class PlaceholderImpl {
	readonly [PlaceholderBrand] = true as const;
}

// Type guard to check if a value is a placeholder
export function isPlaceholder(value: unknown): value is PlaceholderType {
	return (
		value !== null &&
		typeof value === "object" &&
		PlaceholderBrand in value &&
		(value as Record<symbol, unknown>)[PlaceholderBrand] === true
	);
}

// The singleton placeholder instance
// Cast to PlaceholderType to match the branded type in types.ts
export const _: PlaceholderType = new PlaceholderImpl() as unknown as PlaceholderType;
