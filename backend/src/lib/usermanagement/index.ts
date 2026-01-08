import { eq } from "drizzle-orm";
import { getDb } from "../../../framework/src/lib/db/db-connection";
import { tenants } from "../../../framework/src/lib/db/db-schema";
import { addUserToTenant } from "../../../framework/src/lib/usermanagement/user";

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
};
