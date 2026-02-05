/**
 * Business logic for user settings management
 * All database operations and business logic are separated from API layer
 */

import { getDb } from "@framework/lib/db/db-connection";
import { userSpecificData } from "@framework/lib/db/schema/additional-data";
import { eq, and } from "drizzle-orm";

const SETTINGS_KEY_PREFIX = "settings";

/**
 * Build the settings key for a tenant
 * Settings are stored per user AND per tenant
 */
export function getSettingsKey(tenantId: string): string {
  return `${SETTINGS_KEY_PREFIX}_${tenantId}`;
}

/**
 * Get user settings for a specific tenant
 * Returns empty object if no settings exist
 */
export async function getUserSettings(
  userId: string,
  tenantId: string
): Promise<Record<string, any>> {
  const settingsKey = getSettingsKey(tenantId);

  const result = await getDb()
    .select()
    .from(userSpecificData)
    .where(
      and(
        eq(userSpecificData.userId, userId),
        eq(userSpecificData.key, settingsKey)
      )
    )
    .limit(1);

  if (result.length > 0 && result[0]) {
    return result[0].data || {};
  }

  return {};
}

/**
 * Save user settings for a specific tenant
 * Creates new entry if none exists, updates existing entry otherwise
 */
export async function saveUserSettings(
  userId: string,
  tenantId: string,
  settings: Record<string, any>
): Promise<void> {
  const settingsKey = getSettingsKey(tenantId);

  const existing = await getDb()
    .select()
    .from(userSpecificData)
    .where(
      and(
        eq(userSpecificData.userId, userId),
        eq(userSpecificData.key, settingsKey)
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    await getDb()
      .update(userSpecificData)
      .set({
        data: settings,
        version: existing[0].version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSpecificData.id, existing[0].id));
  } else {
    await getDb().insert(userSpecificData).values({
      userId,
      key: settingsKey,
      data: settings,
      version: 1,
    });
  }
}

/**
 * Settings type definition matching the frontend structure
 */
export interface UserSettingsData {
  wiki?: {
    digitalTwin?: {
      entryPoint?: string;
    };
  };
  [key: string]: any;
}

/**
 * Get user settings for a specific user and tenant
 * Convenience function that returns typed settings
 */
export async function getUserSettingsByUserIdAndTenant(
  userId: string,
  tenantId: string
): Promise<UserSettingsData | null> {
  const settings = await getUserSettings(userId, tenantId);
  if (Object.keys(settings).length === 0) {
    return null;
  }
  return settings as UserSettingsData;
}

/**
 * Get the digital twin entry point ID from user settings
 * Convenience function to extract the nested value
 */
export async function getDigitalTwinEntryPointId(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const settings = await getUserSettingsByUserIdAndTenant(userId, tenantId);
  return settings?.wiki?.digitalTwin?.entryPoint || null;
}
