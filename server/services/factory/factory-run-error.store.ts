/** Factory Run Error Store (PR-92) - Serialize/deserialize factory errors */
import { type FactoryError, isFactoryError, FactoryErrorCode, createFactoryError } from "@/types/factory-errors";
import { toFactoryError } from "./factory-error-normalizer";
import { getFactoryGuidance, type FactoryGuidance } from "./factory-error-guidance";

export interface StoredFactoryError {
  error: FactoryError;
  guidance: FactoryGuidance;
}

/**
 * Serialize a FactoryError to a JSON string for DB storage
 */
export function serializeFactoryError(error: FactoryError): string {
  return JSON.stringify(error);
}

/**
 * Serialize any error to a JSON string for DB storage
 * Normalizes the error first using toFactoryError
 */
export function serializeError(err: unknown): string {
  const factoryError = toFactoryError(err);
  return serializeFactoryError(factoryError);
}

/**
 * Deserialize a JSON string to FactoryError
 * Returns null if parsing fails or result is not a valid FactoryError
 */
export function deserializeFactoryError(errorJson: string | null): FactoryError | null {
  if (!errorJson) return null;
  try {
    const parsed = JSON.parse(errorJson);
    if (isFactoryError(parsed)) {
      return parsed;
    }
    // Handle legacy plain string errors
    if (typeof parsed === "string") {
      return createFactoryError(FactoryErrorCode.UNKNOWN, parsed);
    }
    return null;
  } catch {
    // If JSON parsing fails, treat the raw string as the error message
    return createFactoryError(FactoryErrorCode.UNKNOWN, errorJson);
  }
}

/**
 * Get full error info with guidance from stored error string
 */
export function getStoredError(errorJson: string | null): StoredFactoryError | null {
  const error = deserializeFactoryError(errorJson);
  if (!error) return null;
  const guidance = getFactoryGuidance(error);
  return { error, guidance };
}
