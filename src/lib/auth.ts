import { chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CREDENTIALS_PATH = join(homedir(), ".flarectl", "credentials.json");
const API_BASE = "https://api.cloudflare.com/client/v4";

export interface CloudflareAccount {
  email: string;
  accountId: string;
  accountName: string;
  apiToken: string;
  createdAt: string;
}

export interface CredentialsStore {
  current: string | null;
  accounts: CloudflareAccount[];
}

let cachedStore: CredentialsStore | null = null;

export async function loadCredentials(): Promise<CredentialsStore> {
  if (cachedStore) {
    return cachedStore;
  }

  if (Bun.env.CLOUDFLARE_API_TOKEN) {
    cachedStore = {
      current: "env",
      accounts: [
        {
          email: Bun.env.CLOUDFLARE_EMAIL || "env-user",
          accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID || "",
          accountName: "Environment Variables",
          apiToken: Bun.env.CLOUDFLARE_API_TOKEN,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    return cachedStore;
  }

  try {
    const file = Bun.file(CREDENTIALS_PATH);
    const text = await file.text();
    cachedStore = JSON.parse(text);
    return cachedStore!;
  } catch {
    cachedStore = { current: null, accounts: [] };
    return cachedStore;
  }
}

export async function saveCredentials(store: CredentialsStore): Promise<void> {
  cachedStore = store;
  const dir = join(homedir(), ".flarectl");

  try {
    await Bun.write(dir, "");
  } catch {}

  await Bun.write(CREDENTIALS_PATH, JSON.stringify(store, null, 2));
  await chmod(CREDENTIALS_PATH, 0o600);
}

export async function addAccount(account: CloudflareAccount): Promise<void> {
  const store = await loadCredentials();
  const existing = store.accounts.find((a) => a.email === account.email);

  if (existing) {
    existing.apiToken = account.apiToken;
    existing.accountId = account.accountId;
    existing.accountName = account.accountName;
  } else {
    store.accounts.push(account);
  }

  store.current = account.email;
  await saveCredentials(store);
}

export async function removeAccount(email: string): Promise<void> {
  const store = await loadCredentials();
  store.accounts = store.accounts.filter((a) => a.email !== email);

  if (store.current === email) {
    store.current = store.accounts[0]?.email || null;
  }

  await saveCredentials(store);
}

export async function switchAccount(email: string): Promise<void> {
  const store = await loadCredentials();
  const account = store.accounts.find((a) => a.email === email);

  if (!account) {
    throw new Error(`Account not found: ${email}`);
  }

  store.current = email;
  await saveCredentials(store);
}

export async function getCurrentAccount(): Promise<CloudflareAccount | null> {
  const store = await loadCredentials();

  if (!store.current) {
    return store.accounts[0] || null;
  }

  return store.accounts.find((a) => a.email === store.current) || null;
}

interface UserInfo {
  id: string;
  email: string;
}

interface AccountInfo {
  id: string;
  name: string;
}

interface TokenValidation {
  valid: boolean;
  error?: string;
}

async function cfFetch<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    success: boolean;
    errors?: Array<{ message: string }>;
    result: T;
  };

  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "API request failed");
  }

  return data.result;
}

async function validateToken(token: string): Promise<TokenValidation> {
  try {
    await cfFetch("/user/tokens/verify", token);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getUserInfo(token: string): Promise<UserInfo> {
  return cfFetch<UserInfo>("/user", token);
}

async function getAccounts(token: string): Promise<AccountInfo[]> {
  return cfFetch<AccountInfo[]>("/accounts", token);
}

export async function addApiTokenAccount(token: string): Promise<CloudflareAccount> {
  const validation = await validateToken(token);
  if (!validation.valid) {
    throw new Error("Invalid API token. Please check your token and try again.");
  }

  const userInfo = await getUserInfo(token);
  const accounts = await getAccounts(token);

  if (accounts.length === 0) {
    throw new Error("No accounts found for this token.");
  }

  const primaryAccount = accounts[0]!;

  return {
    email: userInfo.email,
    accountId: primaryAccount.id,
    accountName: primaryAccount.name,
    apiToken: token,
    createdAt: new Date().toISOString(),
  };
}

export function getAuthHeaders(): Record<string, string> {
  if (!cachedStore) {
    return {};
  }

  const store = cachedStore;
  const account = store.accounts.find((a) => a.email === store.current) || store.accounts[0];

  if (!account) {
    return {};
  }

  return {
    Authorization: `Bearer ${account.apiToken}`,
  };
}

export function getAccountId(): string {
  if (!cachedStore) {
    return "";
  }

  const store = cachedStore;
  const account = store.accounts.find((a) => a.email === store.current) || store.accounts[0];

  return account?.accountId || "";
}

export function isAuthenticated(): boolean {
  return !!cachedStore?.accounts?.length;
}
