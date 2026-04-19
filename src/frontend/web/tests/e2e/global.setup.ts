import { request, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const storageStatePath = path.join(process.cwd(), "playwright", ".auth", "dev-user.json");

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL?.toString() ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://localhost:3000";

  await mkdir(path.dirname(storageStatePath), { recursive: true });

  const context = await request.newContext({
    baseURL
  });

  const response = await context.post("/api/auth/dev-login");
  if (!response.ok()) {
    throw new Error(`Development login failed with ${response.status()} ${response.statusText()}.`);
  }

  await context.storageState({ path: storageStatePath });
  await context.dispose();
}
