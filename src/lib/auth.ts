import { homedir } from "node:os";
import { join } from "node:path";

const CREDENTIALS_PATH = join(homedir(), ".flarectl", "credentials.json");

export interface CloudflareCredentials {
  apiToken?: string;
  accountId?: string;
  email?: string;
}

let cachedCredentials: CloudflareCredentials | null = null;

export async function loadCredentials(): Promise<CloudflareCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  if (Bun.env.CLOUDFLARE_API_TOKEN) {
    cachedCredentials = {
      apiToken: Bun.env.CLOUDFLARE_API_TOKEN,
      accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
      email: Bun.env.CLOUDFLARE_EMAIL,
    };
    return cachedCredentials;
  }

  try {
    const file = Bun.file(CREDENTIALS_PATH);
    if (await file.exists()) {
      cachedCredentials = await file.json();
      return cachedCredentials!;
    }
  } catch {
  }

  return {};
}

export async function saveCredentials(credentials: CloudflareCredentials): Promise<void> {
  const dir = join(homedir(), ".flarectl");
  await Bun.write(join(dir, ".gitkeep"), "");
  
  await Bun.write(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
  
  cachedCredentials = credentials;
}

export function getAuthHeaders(): Record<string, string> {
  if (!cachedCredentials?.apiToken) {
    throw new Error("Not authenticated. Please set CLOUDFLARE_API_TOKEN or run login.");
  }

  return {
    Authorization: `Bearer ${cachedCredentials.apiToken}`,
    "Content-Type": "application/json",
  };
}

export function getAccountId(): string {
  if (!cachedCredentials?.accountId) {
    throw new Error("Account ID not set. Please set CLOUDFLARE_ACCOUNT_ID.");
  }
  return cachedCredentials.accountId;
}

export function isAuthenticated(): boolean {
  return !!cachedCredentials?.apiToken;
}

export function clearCredentials(): void {
  cachedCredentials = null;
}

loadCredentials();
