import { eq } from "drizzle-orm";
import { getDb } from "../../../framework/src/lib/db/db-connection";
import { tenants } from "../../../framework/src/lib/db/db-schema";
import { addUserToTenant } from "../../../framework/src/lib/usermanagement/user";
import { createKnowledgeText } from "@framework/lib/knowledge/knowledge-texts";
import {
  getDigitalTwinEntryPointId,
  saveUserSettings,
  getUserSettings,
} from "../user-settings";

const DIGITAL_TWIN_DEFAULT_NAME = "Meine Person";
const DIGITAL_TWIN_DEFAULT_TEXT = "Dies ist der Einstiegspunkt für meinen digitalen Zwilling.";

/**
 * Ensures the user has a digital twin entry point configured.
 * Creates one if it doesn't exist and saves it to user settings.
 */
export const ensureDigitalTwinEntryPoint = async (
  userId: string,
  tenantId: string
): Promise<string> => {
  // Check if user already has a digital twin entry point configured
  const existingEntryPointId = await getDigitalTwinEntryPointId(userId, tenantId);

  if (existingEntryPointId) {
    return existingEntryPointId;
  }

  // Create the digital twin entry point as a knowledge text
  const digitalTwinEntry = await createKnowledgeText({
    tenantId,
    userId,
    title: DIGITAL_TWIN_DEFAULT_NAME,
    text: DIGITAL_TWIN_DEFAULT_TEXT,
    tenantWide: false,
    hidden: false,
  });

  // Save the entry point ID to user settings
  const currentSettings = await getUserSettings(userId, tenantId);
  const updatedSettings = {
    ...currentSettings,
    wiki: {
      ...currentSettings.wiki,
      digitalTwin: {
        ...currentSettings.wiki?.digitalTwin,
        entryPoint: digitalTwinEntry.id,
      },
    },
  };
  await saveUserSettings(userId, tenantId, updatedSettings);

  console.log(
    `Created digital twin entry point "${DIGITAL_TWIN_DEFAULT_NAME}" for user ${userId}`
  );

  return digitalTwinEntry.id;
};

export const ensureDefaultTenantAndAddUser = async (
  userId: string,
  email: string
) => {
  let [tenant] = await getDb()
    .select()
    .from(tenants)
    .where(eq(tenants.name, "Default"))
    .limit(1);
  if (!tenant) {
    [tenant] = await getDb()
      .insert(tenants)
      .values({
        name: "Default",
      })
      .returning();
  }

  if (!tenant) {
    throw new Error("Default tenant not found");
  }

  await addUserToTenant(userId, tenant.id, "member");

  // Ensure user has a digital twin entry point configured
  await ensureDigitalTwinEntryPoint(userId, tenant.id);
};
