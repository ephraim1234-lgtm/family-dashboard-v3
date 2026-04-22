import { request, type FullConfig } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const storageStatePath = path.join(process.cwd(), "playwright", ".auth", "owner-user.json");
const defaultEmail = "playwright-owner@example.com";
const defaultPassword = "playwright-password-123";
const defaultDisplayName = "Playwright Owner";

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL?.toString() ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://localhost:3000";
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? defaultEmail;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? defaultPassword;
  const displayName = process.env.PLAYWRIGHT_TEST_DISPLAY_NAME ?? defaultDisplayName;

  await mkdir(path.dirname(storageStatePath), { recursive: true });

  const context = await request.newContext({
    baseURL
  });

  const signupResponse = await context.post("/api/auth/signup", {
    data: {
      email,
      password,
      displayName
    }
  });

  if (!signupResponse.ok() && signupResponse.status() !== 409) {
    throw new Error(`Signup failed with ${signupResponse.status()} ${signupResponse.statusText()}.`);
  }

  if (signupResponse.status() === 409) {
    const loginResponse = await context.post("/api/auth/login", {
      data: {
        email,
        password
      }
    });

    if (!loginResponse.ok()) {
      throw new Error(`Login failed with ${loginResponse.status()} ${loginResponse.statusText()}.`);
    }
  }

  const sessionResponse = await context.get("/api/auth/session");
  if (!sessionResponse.ok()) {
    throw new Error(`Session lookup failed with ${sessionResponse.status()} ${sessionResponse.statusText()}.`);
  }

  const session = (await sessionResponse.json()) as {
    hasActiveHousehold?: boolean;
  };

  if (!session.hasActiveHousehold) {
    const onboardingResponse = await context.post("/api/households/onboarding", {
      data: {
        name: "Playwright Household",
        timeZoneId: "America/Chicago"
      }
    });

    if (!onboardingResponse.ok() && onboardingResponse.status() !== 409) {
      throw new Error(
        `Onboarding failed with ${onboardingResponse.status()} ${onboardingResponse.statusText()}.`
      );
    }
  }

  await context.storageState({ path: storageStatePath });
  await context.dispose();
}
