import type { FastAppHono } from "@framework/types";
import { Hono } from "hono";
import { validator } from "hono-openapi";
import * as v from "valibot";
import { authAndSetUsersInfo } from "@framework/lib/utils/hono-middlewares";
import { HTTPException } from "hono/http-exception";
import {
  getUserSettings,
  saveUserSettings,
} from "../../../lib/user-settings";

const app: FastAppHono = new Hono();

/**
 * Schema for digitalTwin settings
 */
const digitalTwinSchema = v.object({
  entryPoint: v.optional(v.string()),
});

/**
 * Schema for wiki settings
 */
const wikiSchema = v.object({
  digitalTwin: v.optional(digitalTwinSchema),
});

/**
 * Schema for user settings structure
 * Supports wiki.digitalTwin.entryPoint and can be extended with more settings
 */
const userSettingsSchema = v.object({
  wiki: v.optional(wikiSchema),
});

export const defineUserSettingsRoutes = (server: FastAppHono) => {
  server.route("/tenant/:tenantId/user-settings", app);
};

// Get user settings for a specific tenant
app.get(
  "/",
  authAndSetUsersInfo,
  validator(
    "param",
    v.object({
      tenantId: v.string(),
    })
  ),
  async (c) => {
    try {
      const userId = c.get("usersId");
      const { tenantId } = c.req.valid("param");

      const settings = await getUserSettings(userId, tenantId);

      return c.json({ success: true, data: settings });
    } catch (error) {
      console.error("Failed to fetch user settings:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      return c.json(
        { success: false, error: "Failed to fetch user settings" },
        500
      );
    }
  }
);

// Save user settings for a specific tenant
app.post(
  "/",
  authAndSetUsersInfo,
  validator(
    "param",
    v.object({
      tenantId: v.string(),
    })
  ),
  validator("json", userSettingsSchema),
  async (c) => {
    try {
      const userId = c.get("usersId");
      const { tenantId } = c.req.valid("param");
      const body = c.req.valid("json");

      await saveUserSettings(userId, tenantId, body);

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to save user settings:", error);
      if (error instanceof HTTPException) {
        throw error;
      }
      if (error instanceof v.ValiError) {
        throw new HTTPException(400, {
          message: "Validation error",
          cause: error.issues,
        });
      }
      throw new HTTPException(500, {
        message: "Failed to save user settings",
      });
    }
  }
);
