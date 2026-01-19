// ==========================================
// Placeholder Implementation
// ==========================================

import { PlaceholderBrand, type PlaceholderType } from "./types";

// Internal placeholder class with the brand
class PlaceholderImpl implements PlaceholderType {
	readonly [PlaceholderBrand] = true as const;
}

// Helper to check if an object has the placeholder brand
function hasPlaceholderBrand(obj: object): obj is PlaceholderType {
	return PlaceholderBrand in obj;
}

// Type guard to check if a value is a placeholder
export function isPlaceholder(value: unknown): value is PlaceholderType {
	if (value === null || typeof value !== "object") {
		return false;
	}

	return hasPlaceholderBrand(value) && value[PlaceholderBrand] === true;
}

// The singleton placeholder instance - class implements PlaceholderType so no assertion needed
export const _: PlaceholderType = Object.freeze(new PlaceholderImpl());
