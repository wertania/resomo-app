import { defineServer } from "@framework/index";
import * as robotTasksSchema from "./db/schema";
import defineChatRoutes from "./routes/tenant/[tenantId]/chat";
import defineTranscriptionRoutes from "./routes/tenant/[tenantId]/transcription";
import { ensureDefaultTenantAndAddUser } from "./lib/usermanagement";

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
        defineChatRoutes(app);
        defineTranscriptionRoutes(app);
      },
    },
  ],
  customPostRegisterActions: [
    async (userId: string, email: string) =>
      await ensureDefaultTenantAndAddUser(userId, email),
  ],
});

export default server;
