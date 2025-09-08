// Display Name Utility - v5.6 Personal Settings
import { User, UserRecord } from '../types';

/**
 * Get the appropriate display name for a user based on their preferences
 * @param user - Firebase User object
 * @param userRecord - User database record with display preferences
 * @returns The preferred display name or fallback to email
 */
export function getDisplayName(user: User, userRecord?: UserRecord | null): string {
  // If user has display preferences and wants to use display name
  if (userRecord?.useDisplayName && userRecord.displayName?.trim()) {
    return userRecord.displayName.trim();
  }

  // Fallback to Google display name if available
  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  // Final fallback to email
  return user.email;
}

/**
 * Get display name for UI components that may not have userRecord
 * @param user - Firebase User object  
 * @param userRecord - Optional user database record
 * @returns Display name suitable for UI display
 */
export function getUIDisplayName(user: User, userRecord?: UserRecord | null): string {
  return getDisplayName(user, userRecord);
}

/**
 * Get user initials for avatar display
 * @param user - Firebase User object
 * @param userRecord - Optional user database record  
 * @returns Single character initial (uppercase)
 */
export function getUserInitial(user: User, userRecord?: UserRecord | null): string {
  const displayName = getDisplayName(user, userRecord);
  return displayName.charAt(0).toUpperCase();
}

/**
 * Check if user has custom display name set
 * @param userRecord - User database record
 * @returns True if user has custom display name enabled
 */
export function hasCustomDisplayName(userRecord?: UserRecord | null): boolean {
  return Boolean(userRecord?.useDisplayName && userRecord.displayName?.trim());
}