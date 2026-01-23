import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  initTests,
  TEST_ORG1_USER_1,
  TEST_ORGANISATION_1,
} from "@framework/test/init.test";
import { defineUserSettingsRoutes } from "./user-settings";
import { testFetcher } from "@framework/test/fetcher.test";
import { Hono } from "hono";
import { getDb } from "@framework/lib/db/db-connection";
import { userSpecificData } from "@framework/lib/db/schema/additional-data";
import { eq, and, like } from "drizzle-orm";
import type { FastAppHono } from "@framework/types";

let app: FastAppHono;
let userToken: string;
const userId = TEST_ORG1_USER_1.id;
const tenantId = TEST_ORGANISATION_1.id;

beforeAll(async () => {
  await initTests();
  const { user1Token } = await initTests();
  userToken = user1Token;

  app = new Hono();
  defineUserSettingsRoutes(app);

  // Clean up: delete all user settings for the test user (matching settings_* pattern)
  await getDb()
    .delete(userSpecificData)
    .where(
      and(
        eq(userSpecificData.userId, userId),
        like(userSpecificData.key, "settings_%")
      )
    );
});

afterAll(async () => {
  // Clean up: delete all user settings for the test user (matching settings_* pattern)
  await getDb()
    .delete(userSpecificData)
    .where(
      and(
        eq(userSpecificData.userId, userId),
        like(userSpecificData.key, "settings_%")
      )
    );
});

describe("User Settings API", () => {
  test("Get user settings when none exist", async () => {
    const response = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);
    expect(response.jsonResponse?.data).toEqual({});
  });

  test("Create and get user settings", async () => {
    const settings = {
      wiki: {
        digitalTwin: {
          entryPoint: "test-entry-id-123",
        },
      },
    };

    // Create settings
    let response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      settings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Get settings
    response = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);
    expect(response.jsonResponse?.data).toEqual(settings);
    expect(response.jsonResponse?.data.wiki?.digitalTwin?.entryPoint).toBe(
      "test-entry-id-123"
    );
  });

  test("Update existing user settings", async () => {
    const initialSettings = {
      wiki: {
        digitalTwin: {
          entryPoint: "old-entry-id",
        },
      },
    };

    // Create initial settings
    await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      initialSettings
    );

    // Update settings
    const updatedSettings = {
      wiki: {
        digitalTwin: {
          entryPoint: "new-entry-id-456",
        },
      },
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      updatedSettings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify update
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual(updatedSettings);
    expect(getResponse.jsonResponse?.data.wiki?.digitalTwin?.entryPoint).toBe(
      "new-entry-id-456"
    );
  });

  test("Update settings with partial data", async () => {
    const initialSettings = {
      wiki: {
        digitalTwin: {
          entryPoint: "entry-1",
        },
      },
    };

    // Create initial settings
    await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      initialSettings
    );

    // Update with empty wiki object (should clear digitalTwin)
    const updatedSettings = {
      wiki: {},
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      updatedSettings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify update
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual(updatedSettings);
    expect(getResponse.jsonResponse?.data.wiki?.digitalTwin).toBeUndefined();
  });

  test("Save empty settings object", async () => {
    const emptySettings = {};

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      emptySettings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify empty settings
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual({});
  });

  test("Validation error - invalid structure", async () => {
    const invalidSettings = {
      wiki: {
        digitalTwin: {
          entryPoint: 123, // Should be string, not number
        },
      },
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      invalidSettings
    );

    expect(response.status).toBe(400);
  });

  test("Validation error - invalid nested structure", async () => {
    const invalidSettings = {
      wiki: {
        digitalTwin: "not-an-object", // Should be object
      },
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      invalidSettings
    );

    expect(response.status).toBe(400);
  });

  test("Validation error - invalid top-level structure", async () => {
    const invalidSettings = {
      wiki: "not-an-object", // Should be object
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      invalidSettings
    );

    expect(response.status).toBe(400);
  });

  test("Settings with optional fields omitted", async () => {
    const settingsWithoutWiki = {};

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      settingsWithoutWiki
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify settings
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual({});
  });

  test("Settings with wiki but without digitalTwin", async () => {
    const settings = {
      wiki: {},
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      settings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify settings
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual(settings);
  });

  test("Settings with digitalTwin but without entryPoint", async () => {
    const settings = {
      wiki: {
        digitalTwin: {},
      },
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      settings
    );

    expect(response.status).toBe(200);
    expect(response.jsonResponse?.success).toBe(true);

    // Verify settings
    const getResponse = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.jsonResponse?.data).toEqual(settings);
  });

  test("Unauthorized access without token", async () => {
    const response = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      ""
    );

    expect(response.status).toBe(401);
  });

  test("Unauthorized POST without token", async () => {
    const settings = {
      wiki: {
        digitalTwin: {
          entryPoint: "test-id",
        },
      },
    };

    const response = await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      "",
      settings
    );

    expect(response.status).toBe(401);
  });

  test("Settings are tenant-specific - different tenants have different settings", async () => {
    const tenant2Id = "00000000-1111-1111-1111-000000000002"; // TEST_ORGANISATION_2

    // Set settings for tenant 1
    const tenant1Settings = {
      wiki: {
        digitalTwin: {
          entryPoint: "tenant-1-entry-point",
        },
      },
    };

    await testFetcher.post(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken,
      tenant1Settings
    );

    // Set different settings for tenant 2
    const tenant2Settings = {
      wiki: {
        digitalTwin: {
          entryPoint: "tenant-2-entry-point",
        },
      },
    };

    await testFetcher.post(
      app,
      `/tenant/${tenant2Id}/user-settings`,
      userToken,
      tenant2Settings
    );

    // Verify tenant 1 settings
    const tenant1Response = await testFetcher.get(
      app,
      `/tenant/${tenantId}/user-settings`,
      userToken
    );

    expect(tenant1Response.status).toBe(200);
    expect(
      tenant1Response.jsonResponse?.data.wiki?.digitalTwin?.entryPoint
    ).toBe("tenant-1-entry-point");

    // Verify tenant 2 settings (should be different)
    const tenant2Response = await testFetcher.get(
      app,
      `/tenant/${tenant2Id}/user-settings`,
      userToken
    );

    expect(tenant2Response.status).toBe(200);
    expect(
      tenant2Response.jsonResponse?.data.wiki?.digitalTwin?.entryPoint
    ).toBe("tenant-2-entry-point");
  });
});
