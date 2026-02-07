import { defineServer } from "@framework/index";
import { upgradeWebSocket, websocket } from "hono/bun";
import * as robotTasksSchema from "./db/schema";
import defineChatRoutes from "./routes/tenant/[tenantId]/chat";
import defineTranscriptionRoutes from "./routes/tenant/[tenantId]/transcription";
import defineInterviewTranscriptionRoutes from "./routes/tenant/[tenantId]/interview-transcription";
import defineInterviewSessionsRoutes from "./routes/tenant/[tenantId]/interview-sessions";
import { ensureDefaultTenantAndAddUser } from "./lib/usermanagement";
import defineDigitalTwinRoutes from "./routes/tenant/[tenantId]/digital-twin";
import { defineUserSettingsRoutes } from "./routes/tenant/[tenantId]/user-settings";
import { defineRealtimeTranscriptionWsRoute } from "./routes/test/realtime-transcription-ws";

const server = defineServer({
  port: 3100,
  appName: "Resomo",
  basePath: "/api/v1",
  loginUrl: "/login.html",
  magicLoginVerifyUrl: "/magic-login-verify.html",
  staticPublicDataPath: "./public",
  staticPrivateDataPath: "./static",
  customDbSchema: {
    ...robotTasksSchema,
  },
  customHonoApps: [
    {
      baseRoute: "",
      app: (app) => {
        // WebSocket route for realtime transcription (no auth - test endpoint)
        defineRealtimeTranscriptionWsRoute(app, upgradeWebSocket);
      },
    },
  ],
  customHonoAppsWithAuth: [
    {
      baseRoute: "",
      app: (app) => {
        defineChatRoutes(app);
        defineTranscriptionRoutes(app);
        defineInterviewTranscriptionRoutes(app);
        defineInterviewSessionsRoutes(app);
        defineDigitalTwinRoutes(app);
        defineUserSettingsRoutes(app);
      },
    },
  ],
  customPostRegisterActions: [
    async (userId: string, email: string) =>
      await ensureDefaultTenantAndAddUser(userId, email),
  ],
});

// Export with WebSocket handler for Bun's native WebSocket support (realtime transcription)
export default {
  ...server,
  websocket,
};
